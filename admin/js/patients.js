// admin/js/patients.js (FINAL CORRECTED VERSION)
document.addEventListener('DOMContentLoaded', function() {
    
    const patientTableBody = document.querySelector('.data-table tbody');
    const addPatientBtn = document.getElementById('addPatientBtn');
    const patientModal = document.getElementById('patientModal');
    const closePatientModalBtn = document.getElementById('closePatientModalBtn');
    const patientForm = document.getElementById('patient-form');
    const therapistSelect = document.getElementById('assigned-therapist');
    const modalTitle = document.getElementById('patientModalTitle');
    const patientIdField = document.getElementById('patient-id-field');
    const savePatientBtn = document.getElementById('savePatientBtn');
    const deletePatientBtn = document.getElementById('deletePatientBtn');
    const avatarPreview = document.getElementById('patient-avatar-preview');
    const avatarUploadBtn = document.getElementById('avatarUploadBtn');
    const avatarCameraBtn = document.getElementById('avatarCameraBtn');
    const avatarFileInput = document.getElementById('avatarFileInput');
    const cameraModal = document.getElementById('cameraModal');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    const closeCameraModalBtn = document.getElementById('closeCameraModalBtn');
    const toastConfig = { duration: 3000, close: true, gravity: "top", position: "right", stopOnFocus: true };
    let allPatients = [];
    let pendingAvatarFile = null; // File or Blob to upload after save
    let cameraStream = null;

    async function fetchApi(url, options = {}) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                let e = 'API error.';
                try { const t = await response.json(); e = t.message || e } catch (n) { e = response.statusText }
                throw new Error(e)
            }
            return response.status === 204 || options.method === 'DELETE' ? { success: true } : response.json();
        } catch (t) {
            console.error(`API Error on ${url}:`, t);
            Toastify({ ...toastConfig, text: `Error: ${t.message}`, style: { background: "var(--red-accent)" } }).showToast();
            return null;
        }
    }
    async function fetchAndRenderPatients() { if (!patientTableBody) return; patientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Loading...</td></tr>`; const result = await fetchApi(`${API_BASE_URL}/api/patients`); if (result && result.success) { allPatients = result.data; renderPatientTable(allPatients); } else { patientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--red-accent);">Failed to fetch patient history.</td></tr>`; } }
    function renderPatientTable(patients) { if (!patientTableBody) return; patientTableBody.innerHTML = ''; if (patients.length === 0) { patientTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">No patients found.</td></tr>`; return; } patients.forEach(patient => { const row = document.createElement('tr'); row.dataset.patientId = patient.raw_id; row.innerHTML = `<td>${patient.display_id}</td><td><div class="table-user-cell"><img src="${patient.avatarUrl}" alt="Avatar"><span>${patient.fullName}</span></div></td><td>${patient.phoneNumber || 'N/A'}</td><td>${patient.lastVisit}</td><td>${patient.assignedTherapist}</td><td><div class="action-buttons"><button class="btn-action view" title="View Details"><i class="fa-solid fa-eye"></i></button><button class="btn-action edit" title="Edit Patient"><i class="fa-solid fa-pencil"></i></button></div></td>`; patientTableBody.appendChild(row); }); }
    async function populateTherapistDropdown() { if (!therapistSelect) return; const result = await fetchApi(`${API_BASE_URL}/api/staff`);; if (result && result.success) { therapistSelect.innerHTML = '<option value="">-- Select Therapist --</option>'; result.data.forEach(staff => { const option = document.createElement('option'); option.value = staff.id; option.textContent = staff.full_name; therapistSelect.appendChild(option); }); } else { therapistSelect.innerHTML = '<option value="">Could not load therapists</option>'; } }

    async function openModalForEdit(patientId) {
        modalTitle.textContent = 'Edit Patient';
        savePatientBtn.textContent = 'Save Changes';
        if (deletePatientBtn) deletePatientBtn.style.display = 'block';
        patientForm.reset();
        patientIdField.value = patientId;
        patientModal.style.display = 'flex';
        await populateTherapistDropdown();
        const result = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}`);
        if (result && result.success) {
            const patientData = result.data;
            patientForm.querySelector('[name="full_name"]').value = patientData.full_name;
            patientForm.querySelector('[name="date_of_birth"]').value = patientData.date_of_birth;
            patientForm.querySelector('[name="gender"]').value = patientData.gender || '';
            patientForm.querySelector('[name="phone_number"]').value = patientData.phone_number;
            patientForm.querySelector('[name="email"]').value = patientData.email;
            patientForm.querySelector('[name="address"]').value = patientData.address;
            patientForm.querySelector('[name="assigned_therapist_id"]').value = patientData.assigned_therapist_id;
            if (avatarPreview) {
                avatarPreview.src = patientData.avatar_url || '';
            }
            pendingAvatarFile = null;
        }
    }

    function openModalForAdd() {
        modalTitle.textContent = 'Add New Patient';
        savePatientBtn.textContent = 'Save Patient';
        if (deletePatientBtn) deletePatientBtn.style.display = 'none';
        patientForm.reset();
        patientIdField.value = '';
        populateTherapistDropdown();
        patientModal.style.display = 'flex';
        if (avatarPreview) avatarPreview.removeAttribute('src');
        pendingAvatarFile = null;
    }

    if (addPatientBtn) addPatientBtn.addEventListener('click', openModalForAdd);
    if (closePatientModalBtn) closePatientModalBtn.addEventListener('click', () => { patientModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == patientModal) patientModal.style.display = 'none'; });

    if (patientTableBody) {
        patientTableBody.addEventListener('click', function(event) {
            const targetButton = event.target.closest('button.btn-action'); if (!targetButton) return;
            const patientId = targetButton.closest('tr').dataset.patientId; if (!patientId) return;
            if (targetButton.classList.contains('edit')) { openModalForEdit(patientId); } 
            else if (targetButton.classList.contains('view')) { localStorage.setItem('selectedPatientId', patientId); window.location.href = 'patient-detail.html'; }
        });
    }

    if (patientForm) {
        patientForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const patientId = patientIdField.value;
            const isEditing = !!patientId;
            const formData = new FormData(patientForm);
            const patientData = Object.fromEntries(formData.entries());
            delete patientData.patientId;
            const url = isEditing ? `${API_BASE_URL}/api/patients/${patientId}` : `${API_BASE_URL}/api/patients`;
            const method = isEditing ? 'PATCH' : 'POST';
            const result = await fetchApi(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patientData) });
            if (result) {
                const successMessage = isEditing ? "Patient updated!" : "Patient created!";
                const toastColor = isEditing ? "var(--primary-accent)" : "var(--green-accent)";
                Toastify({...toastConfig, text: successMessage, style: { background: toastColor }}).showToast();

                // If creating a new patient, trigger Edge Function to create Auth account
                if (!isEditing) {
                    const payload = {
                        full_name: patientData.full_name,
                        email: patientData.email,
                        phone_number: patientData.phone_number,
                        date_of_birth: patientData.date_of_birth,
                        address: patientData.address,
                        gender: patientData.gender,
                        assigned_therapist_id: patientData.assigned_therapist_id
                    };

                    const tryInvoke = async () => {
                        if (!window.supabaseClient || !window.SUPABASE_FUNCTION_CREATE_PATIENT) {
                            throw new Error('Supabase client not initialized or function name missing');
                        }
                        const { data, error } = await window.supabaseClient.functions.invoke(window.SUPABASE_FUNCTION_CREATE_PATIENT, { body: payload });
                        if (error) throw error;
                        return data;
                    };

                    const tryHttp = async () => {
                        if (!window.SUPABASE_FUNCTION_URL || !window.SUPABASE_ANON_KEY) {
                            throw new Error('Function URL or anon key missing');
                        }
                        const res = await fetch(window.SUPABASE_FUNCTION_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': window.SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                            },
                            body: JSON.stringify(payload)
                        });
                        if (!res.ok) {
                            let msg = 'Function request failed';
                            try { const j = await res.json(); msg = j?.error || j?.message || msg; } catch {}
                            throw new Error(msg);
                        }
                        return res.json();
                    };

                    try {
                        let data = null;
                        const mode = (window.SUPABASE_FUNCTION_MODE || 'auto').toLowerCase();
                        if (mode === 'invoke') {
                            data = await tryInvoke();
                        } else if (mode === 'http') {
                            data = await tryHttp();
                        } else {
                            // auto: try invoke, then fallback to http
                            try { data = await tryInvoke(); }
                            catch (e) { console.warn('Invoke failed, trying HTTP:', e?.message || e); data = await tryHttp(); }
                        }

                        // Optionally patch auth_user_id back to your API if function returned it
                        const createdPatientId = (result.data && (result.data.id || result.data.raw_id)) || null;
                        if (data && data.auth_user_id && createdPatientId) {
                            await fetchApi(`${API_BASE_URL}/api/patients/${createdPatientId}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ auth_user_id: data.auth_user_id })
                            });
                        }

                        // Show credentials modal to staff
                        showCredentialsModal(patientData.email, window.TEMP_PATIENT_PASSWORD || 'KPC@2025');
                    } catch (err) {
                        console.error('Edge Function call failed:', err);
                        Toastify({ ...toastConfig, text: `Could not create Auth account: ${err.message || err}`, style: { background: "var(--red-accent)" } }).showToast();
                    }
                }

                // Upload avatar if a file/photo is pending
                try {
                    const savedId = isEditing ? patientId : (result.data && (result.data.id || result.data.raw_id));
                    if (savedId) await uploadAvatarIfNeeded(savedId);
                } catch (e) {
                    console.error('Avatar upload failed:', e);
                    Toastify({ ...toastConfig, text: 'Avatar upload failed', style: { background: 'var(--red-accent)' } }).showToast();
                }
                patientModal.style.display = 'none';
                setTimeout(() => fetchAndRenderPatients(), 1500);
            }
        });
    }

    // --- Credentials Modal helpers ---
    function showCredentialsModal(email, tempPassword) {
        const modal = document.getElementById('credentialsModal');
        if (!modal) return;
        const emailEl = document.getElementById('cred-email');
        const passEl = document.getElementById('cred-password');
        emailEl.value = email || '';
        passEl.value = tempPassword || '';
        modal.style.display = 'flex';

        const closeBtn = document.getElementById('closeCredentialsModalBtn');
        const doneBtn = document.getElementById('doneCredentialsBtn');
        const copyBtn = document.getElementById('copyCredsBtn');

        const close = () => { modal.style.display = 'none'; };
        if (closeBtn) closeBtn.onclick = close;
        if (doneBtn) doneBtn.onclick = close;
        window.addEventListener('click', function onWinClick(e) {
            if (e.target === modal) { close(); window.removeEventListener('click', onWinClick); }
        });
        if (copyBtn) {
            copyBtn.onclick = async () => {
                try {
                    const text = `Email: ${emailEl.value}\nPassword: ${passEl.value}`;
                    await navigator.clipboard.writeText(text);
                    Toastify({ ...toastConfig, text: 'Copied to clipboard', style: { background: 'var(--primary-accent)' } }).showToast();
                } catch (e) {
                    Toastify({ ...toastConfig, text: 'Copy failed', style: { background: 'var(--red-accent)' } }).showToast();
                }
            };
        }
    }

    // --- Avatar upload & camera capture ---
    function fileToObjectURL(file) { return URL.createObjectURL(file); }

    if (avatarUploadBtn && avatarFileInput) {
        avatarUploadBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); avatarFileInput.click(); });
        avatarFileInput.addEventListener('change', () => {
            const file = avatarFileInput.files && avatarFileInput.files[0];
            if (!file) return;
            pendingAvatarFile = file;
            if (avatarPreview) avatarPreview.src = fileToObjectURL(file);
        });
    }

    async function startCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraVideo.srcObject = cameraStream;
            cameraVideo.style.display = 'block';
            cameraCanvas.style.display = 'none';
            captureBtn.style.display = 'inline-block';
            retakeBtn.style.display = 'none';
            usePhotoBtn.style.display = 'none';
        } catch (e) {
            Toastify({ ...toastConfig, text: 'Camera permission denied', style: { background: 'var(--red-accent)' } }).showToast();
        }
    }
    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
        }
        cameraVideo.srcObject = null;
    }
    function openCameraModal() {
        if (!cameraModal) return;
        cameraModal.style.display = 'flex';
        startCamera();
    }
    function closeCameraModal() {
        if (!cameraModal) return;
        stopCamera();
        cameraModal.style.display = 'none';
    }
    if (avatarCameraBtn) avatarCameraBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openCameraModal(); });
    if (closeCameraModalBtn) closeCameraModalBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeCameraModal(); });
    if (cameraModal) window.addEventListener('click', (e) => { if (e.target === cameraModal) closeCameraModal(); });

    if (captureBtn && cameraCanvas && cameraVideo) {
        captureBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const width = cameraVideo.videoWidth;
            const height = cameraVideo.videoHeight;
            if (!width || !height) return;
            cameraCanvas.width = width; cameraCanvas.height = height;
            const ctx = cameraCanvas.getContext('2d');
            ctx.drawImage(cameraVideo, 0, 0, width, height);
            cameraVideo.style.display = 'none';
            cameraCanvas.style.display = 'block';
            captureBtn.style.display = 'none';
            retakeBtn.style.display = 'inline-block';
            usePhotoBtn.style.display = 'inline-block';
        });
    }
    if (retakeBtn) retakeBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        cameraCanvas.style.display = 'none';
        cameraVideo.style.display = 'block';
        captureBtn.style.display = 'inline-block';
        retakeBtn.style.display = 'none';
        usePhotoBtn.style.display = 'none';
    });
    if (usePhotoBtn && cameraCanvas) {
        usePhotoBtn.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            cameraCanvas.toBlob((blob) => {
                if (!blob) return;
                pendingAvatarFile = new File([blob], 'camera.jpg', { type: 'image/jpeg' });
                if (avatarPreview) avatarPreview.src = fileToObjectURL(pendingAvatarFile);
                closeCameraModal();
            }, 'image/jpeg', 0.9);
        });
    }

    async function uploadAvatarIfNeeded(patientId) {
        if (!pendingAvatarFile) return; // nothing to upload
        if (!window.supabaseClient || !window.AVATARS_BUCKET) throw new Error('Supabase storage not configured');
        const ext = (pendingAvatarFile.type || '').includes('png') ? 'png' : 'jpg';
        const path = `patients/${patientId}-${Date.now()}.${ext}`;
        const { error: upErr } = await window.supabaseClient.storage.from(window.AVATARS_BUCKET).upload(path, pendingAvatarFile, { upsert: true, contentType: pendingAvatarFile.type || 'image/jpeg' });
        if (upErr) throw upErr;
        const { data: pub } = window.supabaseClient.storage.from(window.AVATARS_BUCKET).getPublicUrl(path);
        if (pub?.publicUrl) {
            await fetchApi(`${API_BASE_URL}/api/patients/${patientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: pub.publicUrl })
            });
        }
        pendingAvatarFile = null;
    }
    
    if (deletePatientBtn) {
        deletePatientBtn.addEventListener('click', function() {
            const patientId = patientIdField.value;
            if (!patientId) return;
            const toast = Toastify({ text: "<strong>Delete this patient?</strong><br>This can't be undone.", escapeMarkup: false, duration: -1, close: true, gravity: "center", position: "center", style: { background: "#1e293b", border: "1px solid var(--red-accent)" } }).showToast();
            const toastEl = toast.toastElement;
            const buttonContainer = document.createElement('div'); buttonContainer.style.cssText = "margin-top: 15px; text-align: right;";
            const yesButton = document.createElement('button'); yesButton.innerText = "Yes, Delete"; yesButton.className = "btn-danger"; yesButton.style.marginRight = "10px";
            const noButton = document.createElement('button'); noButton.innerText = "Cancel"; noButton.className = "btn-secondary-action";
            buttonContainer.append(noButton, yesButton);
            toastEl.appendChild(buttonContainer);
            yesButton.onclick = async function() {
                toast.hideToast();
                const result = await fetchApi(`${API_BASE_URL}/api/patients/${patientId}`, { method: 'DELETE' });
                if (result) {
                    Toastify({...toastConfig, text: "Patient deleted.", style: { background: "var(--red-accent)" }}).showToast();
                    patientModal.style.display = 'none';
                    fetchAndRenderPatients();
                }
            };
            noButton.onclick = function() { toast.hideToast(); };
        });
    }
    
    fetchAndRenderPatients();
});
