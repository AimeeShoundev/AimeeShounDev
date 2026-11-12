# Resume page for GitHub Pages

This folder is ready for static hosting. It contains `index.html`, `style.css`, `script.js`, and the original resume PDF.

## Put on GitHub Pages

1. Extract the ZIP file.
2. Upload **all four files to the same folder** in your GitHub repository (for example the repository root, or a `resume/` folder).
3. If using a new repository, go to **Settings → Pages → Build and deployment**, select **Deploy from a branch**, choose `main` and `/ (root)`, then save. Wait for GitHub to publish.
4. Visit your Pages URL. For a `resume/` folder inside your existing `aimeeshoundev.github.io` site, use `https://aimeeshoundev.github.io/resume/`. If you put the files in a separate repository, the URL may instead be `https://aimeeshoundev.github.io/REPOSITORY-NAME/`.

## Direct PDF link

If you upload these files inside `resume/` in your existing `aimeeshoundev.github.io` repository, your direct PDF URL will be:

`https://aimeeshoundev.github.io/resume/Aimee_Shoun_Resume_11_12_2026.pdf`

This URL will work **only after you upload and publish the file**.

## Add just a link on an existing portfolio page

```html
<a href="/resume/Aimee_Shoun_Resume_11_12_2026.pdf" target="_blank" rel="noopener noreferrer">View My Resume (PDF)</a>
<a href="/resume/Aimee_Shoun_Resume_11_12_2026.pdf" download>Download My Resume</a>
```

No server-side code or packages are needed.
