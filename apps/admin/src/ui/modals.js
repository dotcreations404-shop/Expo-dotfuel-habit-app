const sb = window.sb;

function closeModal(id)  { document.getElementById(id).classList.remove('open'); }
function handleOverlay(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }


window.closeModal = closeModal;
window.handleOverlay = handleOverlay;
