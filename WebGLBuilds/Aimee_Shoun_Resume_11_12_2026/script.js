// All PDF links use a relative path so the page works on GitHub Pages,
// including inside a repository subfolder.
const RESUME_PDF = './Aimee_Shoun_Resume_11_12_2026.pdf';

for (const id of ['viewResume', 'downloadResume']) {
  const link = document.getElementById(id);
  if (link) link.href = RESUME_PDF;
}

const preview = document.getElementById('resumePreview');
if (preview) preview.src = `${RESUME_PDF}#view=FitH`;
