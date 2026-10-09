export async function loadTemplate(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(
      `Could not load ${path}: ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

export function renderWithTemplate(template, parentElement) {
  parentElement.innerHTML = template;
}

export async function loadHeaderFooter() {
  const headerTemplate = await loadTemplate("/partials/header.html");
  const footerTemplate = await loadTemplate("/partials/footer.html");

  const headerElement = document.querySelector("#header-main");
  const footerElement = document.querySelector("#footer-main");

  if (headerElement) {
    headerElement.innerHTML = headerTemplate;
  }

  if (footerElement) {
    footerElement.innerHTML = footerTemplate;
  }
}