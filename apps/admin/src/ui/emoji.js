const sb = window.sb;

let selectedChallengeEmoji = '💪';
let selectedBadgeEmoji     = '🏆';

function initEmojiPickers() {
  buildPicker('ch-emoji-picker',    '💪 🔥 🚶 ⚡ 💧 🌈 🌅 🚫 🎯 🏋️ 🧘 🏃 🚴 🥗 🥦 🫀 🏆 🌟 ⚖️ 🎖️'.split(' '), e => { selectedChallengeEmoji = e; });
  buildPicker('badge-emoji-picker', '🔥 💎 💪 💧 🥗 ⚡ 🏆 🌟 🎖️ 🥇 🎯 🏅'.split(' '),                                e => { selectedBadgeEmoji = e; });
}

function buildPicker(containerId, emojis, onSelect) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  emojis.forEach((emoji, i) => {
    const btn = document.createElement('div');
    btn.className = 'ep-opt' + (i === 0 ? ' selected' : '');
    btn.textContent = emoji;
    btn.onclick = () => {
      container.querySelectorAll('.ep-opt').forEach(e => e.classList.remove('selected'));
      btn.classList.add('selected');
      onSelect(emoji);
    };
    container.appendChild(btn);
  });
  if (emojis.length > 0) onSelect(emojis[0]);
}

function setPickerEmoji(containerId, emoji, onSelect) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.ep-opt').forEach(btn => {
    const isMatch = btn.textContent === emoji;
    btn.classList.toggle('selected', isMatch);
    if (isMatch) onSelect(emoji);
  });
}


window.initEmojiPickers = initEmojiPickers;
window.buildPicker = buildPicker;
window.setPickerEmoji = setPickerEmoji;
