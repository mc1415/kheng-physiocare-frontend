document.addEventListener('DOMContentLoaded', function () {
  const productTableBody = document.querySelector('.data-table tbody');
  const addProductBtn = document.getElementById('addProductBtn');
  const addProductModal = document.getElementById('addProductModal');
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const productForm = document.getElementById('add-product-form');
  const modalTitle = document.getElementById('productModalTitle');
  const saveBtn = document.getElementById('saveProductBtn');
  const productIdField = document.getElementById('productIdField');
  const productImageUrlField = document.getElementById('product-image-url');
  const productImageFileInput = document.getElementById('product-image-file');
  const productImageDropZone = document.getElementById('product-image-drop-zone');
  const productImagePreview = document.getElementById('product-image-preview');
  const productImagePrompt = document.getElementById('product-image-prompt');
  const removeProductImageBtn = document.getElementById('remove-product-image-btn');

  const EMPTY_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const PRODUCT_BUCKET = window.PRODUCT_IMAGES_BUCKET || 'product-images';

  const toastConfig = {
    duration: 3000,
    close: true,
    gravity: 'top',
    position: 'right',
    stopOnFocus: true,
  };

  function toast(message, ok = true) {
    Toastify({
      ...toastConfig,
      text: message,
      style: { background: ok ? 'var(--primary-accent)' : 'var(--red-accent)' },
    }).showToast();
  }

  async function fetchApi(url, options = {}) {
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || response.statusText || 'API error');
      }
      return data;
    } catch (error) {
      console.error(`API Error on ${url}:`, error);
      toast(`Error: ${error.message}`, false);
      return null;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function normalizeSupabaseImageUrl(url) {
    if (!url) return '';
    const value = String(url).trim();
    if (!value) return '';
    if (value.includes('/storage/v1/object/public/')) return value;

    const marker = '/storage/v1/object/';
    const idx = value.indexOf(marker);
    if (idx >= 0) {
      const tail = value.slice(idx + marker.length);
      if (!tail.startsWith('public/')) {
        return `${value.slice(0, idx)}${marker}public/${tail}`;
      }
    }
    return value;
  }

  function setUploaderBusy(busy, text = 'Click to upload or drag and drop') {
    if (!productImagePrompt) return;
    const label = productImagePrompt.querySelector('span');
    if (label) label.textContent = text;
    if (busy) {
      productImageDropZone.classList.add('is-uploading');
    } else {
      productImageDropZone.classList.remove('is-uploading');
    }
  }

  function setImagePreview(src) {
    if (!src) {
      productImagePreview.src = EMPTY_IMG;
      productImageDropZone.classList.remove('has-image');
      productImagePrompt.style.display = 'flex';
      setUploaderBusy(false);
      return;
    }
    productImagePreview.src = src;
    productImageDropZone.classList.add('has-image');
    productImagePrompt.style.display = 'none';
    setUploaderBusy(false);
  }

  function clearImageSelection() {
    productImageUrlField.value = '';
    if (productImageFileInput) productImageFileInput.value = '';
    setImagePreview('');
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read image file.'));
      reader.readAsDataURL(file);
    });
  }

  async function compressImageToBlob(file, maxSize = 1200, quality = 0.82) {
    const sourceDataUrl = await fileToDataUrl(file);
    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Could not process image.'));
      image.src = sourceDataUrl;
    });

    const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
    const targetW = Math.max(1, Math.round(img.width * ratio));
    const targetH = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Could not encode image.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  }

  async function uploadImageToStorage(file) {
    if (!window.supabaseClient) {
      throw new Error('Supabase client is not initialized.');
    }

    const blob = await compressImageToBlob(file);
    const safeBaseName = (file.name || 'product-image')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-');
    const filePath = `products/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeBaseName}.jpg`;

    const { error: uploadError } = await window.supabaseClient.storage
      .from(PRODUCT_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload image.');
    }

    const { data } = window.supabaseClient.storage.from(PRODUCT_BUCKET).getPublicUrl(filePath);
    if (!data || !data.publicUrl) {
      throw new Error('Failed to get public image URL.');
    }

    return normalizeSupabaseImageUrl(data.publicUrl);
  }

  async function applySelectedFile(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please choose an image file.', false);
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast('Image must be 5MB or smaller.', false);
      return;
    }

    setUploaderBusy(true, 'Uploading image...');
    try {
      const publicUrl = await uploadImageToStorage(file);
      productImageUrlField.value = publicUrl;
      setImagePreview(publicUrl);
      toast('Image uploaded successfully.');
    } finally {
      setUploaderBusy(false);
    }
  }

  async function fetchAndRenderProducts() {
    if (!productTableBody) return;
    productTableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';

    const result = await fetchApi(`${API_BASE_URL}/api/products`);
    if (!result || !result.success) {
      productTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--red-accent);">Failed to load products.</td></tr>';
      return;
    }

    renderProductTable(result.data || []);
  }

  function renderProductTable(products) {
    if (!productTableBody) return;
    productTableBody.innerHTML = '';

    if (!products.length) {
      productTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No products found.</td></tr>';
      return;
    }

    products.forEach((prod) => {
      let status = 'In Stock';
      let statusClass = 'instock';

      if (Number(prod.stock_level) <= 0) {
        status = 'Out of Stock';
        statusClass = 'outofstock';
      } else if (Number(prod.stock_level) <= 10) {
        status = 'Low Stock';
        statusClass = 'lowstock';
      }

      const normalizedImageUrl = normalizeSupabaseImageUrl(prod.image_url);
      const thumb = normalizedImageUrl
        ? `<img src="${escapeHtml(normalizedImageUrl)}" alt="${escapeHtml(prod.name || 'Product')}" style="width:34px;height:34px;border-radius:6px;object-fit:cover;border:1px solid var(--border-color);margin-right:8px;">`
        : '<span style="display:inline-flex;width:34px;height:34px;border-radius:6px;align-items:center;justify-content:center;background:#eef4ff;border:1px solid var(--border-color);margin-right:8px;"><i class="fa-solid fa-box-open" style="font-size:12px;color:#6f86a8;"></i></span>';

      const row = document.createElement('tr');
      row.dataset.productId = prod.id;
      row.innerHTML = `
        <td><div style="display:flex;align-items:center;">${thumb}<span>${escapeHtml(prod.name)}</span></div></td>
        <td>${escapeHtml(prod.sku || '')}</td>
        <td>${escapeHtml(prod.category || 'N/A')}</td>
        <td>${Number(prod.stock_level || 0)}</td>
        <td>$${Number(prod.unit_price || 0).toFixed(2)}</td>
        <td><span class="status-chip ${statusClass}">${status}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-action edit" title="Edit Product"><i class="fa-solid fa-pencil"></i></button>
          </div>
        </td>
      `;
      productTableBody.appendChild(row);
    });
  }

  function openModalForAdd() {
    modalTitle.textContent = 'Add New Product';
    saveBtn.textContent = 'Save Product';
    productForm.reset();
    productIdField.value = '';
    clearImageSelection();
    addProductModal.style.display = 'flex';
  }

  async function openModalForEdit(productId) {
    modalTitle.textContent = 'Edit Product';
    saveBtn.textContent = 'Save Changes';
    productForm.reset();
    productIdField.value = productId;
    clearImageSelection();

    const result = await fetchApi(`${API_BASE_URL}/api/products/${productId}`);
    if (!result || !result.success) return;

    const product = result.data;
    document.getElementById('product-name').value = product.name || '';
    document.getElementById('product-sku').value = product.sku || '';
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-stock').value = product.stock_level ?? 0;
    document.getElementById('product-price').value = product.unit_price ?? 0;
    const normalizedImageUrl = normalizeSupabaseImageUrl(product.image_url);
    productImageUrlField.value = normalizedImageUrl;
    setImagePreview(normalizedImageUrl);

    addProductModal.style.display = 'flex';
  }

  if (addProductBtn) addProductBtn.addEventListener('click', openModalForAdd);

  if (closeProductModalBtn) {
    closeProductModalBtn.addEventListener('click', () => {
      addProductModal.style.display = 'none';
    });
  }

  window.addEventListener('click', (event) => {
    if (event.target === addProductModal) addProductModal.style.display = 'none';
  });

  if (productTableBody) {
    productTableBody.addEventListener('click', (event) => {
      const editButton = event.target.closest('.btn-action.edit');
      if (!editButton) return;
      const productId = editButton.closest('tr')?.dataset?.productId;
      if (productId) openModalForEdit(productId);
    });
  }

  if (productImageFileInput) {
    productImageFileInput.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        await applySelectedFile(file);
      } catch (error) {
        toast(error.message, false);
      }
    });
  }

  if (productImageDropZone) {
    productImageDropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      productImageDropZone.classList.add('drag-over');
    });

    productImageDropZone.addEventListener('dragleave', () => {
      productImageDropZone.classList.remove('drag-over');
    });

    productImageDropZone.addEventListener('drop', async (event) => {
      event.preventDefault();
      productImageDropZone.classList.remove('drag-over');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        await applySelectedFile(file);
      } catch (error) {
        toast(error.message, false);
      }
    });
  }

  if (removeProductImageBtn) {
    removeProductImageBtn.addEventListener('click', () => {
      clearImageSelection();
    });
  }

  if (productForm) {
    productForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(productForm);
      const productData = Object.fromEntries(formData.entries());
      const productId = productData.productId;
      const isEditing = !!productId;
      delete productData.productId;

      if (!productData.sku) productData.sku = null;

      const url = isEditing
        ? `${API_BASE_URL}/api/products/${productId}`
        : `${API_BASE_URL}/api/products`;
      const method = isEditing ? 'PATCH' : 'POST';

      const result = await fetchApi(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (!result || !result.success) return;

      toast(isEditing ? 'Product updated successfully!' : 'Product added successfully!');
      addProductModal.style.display = 'none';
      fetchAndRenderProducts();
    });
  }

  fetchAndRenderProducts();
});
