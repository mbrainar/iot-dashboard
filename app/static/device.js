// Close the Actions menu when clicking anywhere outside it.
document.addEventListener("click", (e) => {
  document.querySelectorAll("details.actions[open]").forEach((d) => {
    if (!d.contains(e.target)) d.removeAttribute("open");
  });
});

// navigator.clipboard is unavailable on plain-http origins, so fall back to execCommand.
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  return Promise.resolve();
}

// ssh:// links only work if the OS has a registered handler, so also copy the
// command to the clipboard as a fallback.
document.querySelectorAll(".js-ssh").forEach((link) => {
  link.addEventListener("click", () => {
    const cmd = link.getAttribute("data-copy");
    copyText(cmd)
      .then(() => {
        const note = document.getElementById("action-note");
        note.textContent = `Copied "${cmd}" to clipboard. If no SSH client opened, paste it into a terminal.`;
        note.hidden = false;
      })
      .catch(() => {});
    link.closest("details").removeAttribute("open");
  });
});
