document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('note-form');
    const noteIdInput = document.getElementById('note-id');
    const noteTextInput = document.getElementById('note-text');
    const noteList = document.getElementById('note-list');

    const API_URL = '/api/notes';

    // تابع برای دریافت و نمایش یادداشت‌ها
    const getNotes = async () => {
        const response = await fetch(API_URL);
        const notes = await response.json();
        
        noteList.innerHTML = ''; // پاک کردن لیست فعلی
        notes.forEach(note => {
            const li = document.createElement('li');
            li.dataset.id = note.id;
            li.innerHTML = `
                <span>${note.text}</span>
                <div class="actions">
                    <button class="edit-btn">✏️</button>
                    <button class="delete-btn">❌</button>
                </div>
            `;
            noteList.appendChild(li);
        });
    };

    // مدیریت ارسال فرم (برای افزودن یا ویرایش)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = noteIdInput.value;
        const text = noteTextInput.value.trim();

        if (!text) return;

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;

        await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        form.reset();
        noteIdInput.value = '';
        await getNotes();
    });

    // مدیریت کلیک روی دکمه‌های ویرایش و حذف
    noteList.addEventListener('click', async (e) => {
        const id = e.target.closest('li').dataset.id;

        if (e.target.classList.contains('delete-btn')) {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            await getNotes();
        }

        if (e.target.classList.contains('edit-btn')) {
            const text = e.target.closest('li').querySelector('span').textContent;
            noteIdInput.value = id;
            noteTextInput.value = text;
            noteTextInput.focus();
        }
    });

    // بارگذاری اولیه یادداشت‌ها
    getNotes();
});