document.addEventListener('DOMContentLoaded', () => {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `
        <p>&copy; ${new Date().getFullYear()} My Chess Diary. All Rights Reserved.</p>
        <p>Built with pure professionalism :3</p>
    `;
    document.body.appendChild(footer);
});
