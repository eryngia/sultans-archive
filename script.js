const BASE_PATH = "/sultans-archive";

function withBasePath(path) {
    return path.startsWith("/") ? `${BASE_PATH}${path}` : path;
}

function getSitePathParts() {
    const pathname = window.location.pathname;
    const sitePath = pathname === BASE_PATH
        ? "/"
        : pathname.startsWith(`${BASE_PATH}/`)
            ? pathname.slice(BASE_PATH.length)
            : pathname;

    return sitePath.split("/").filter(Boolean);
}

fetch(withBasePath(`/${getSitePathParts()[0]}/sidebar.html`))
    .then(response => response.text())
    .then(html => {
        document.getElementById("sidebar").innerHTML = html;
    })
    .then(initSidebar);

function initSidebar() {
    const parts = getSitePathParts();
    if (parts.length < 3) return;

    const [, category, id] = parts;

    const currentLink = document.querySelector(
        `.sidebar-category .dataset-list a[href$="/${category}/${id}/"]`
    );

    if (!currentLink) return;

    const details = currentLink.closest(".sidebar-category");
    if (details) {
        details.open = true;
    }

    currentLink.classList.add("active");

    const sidebar = document.querySelector(".sidebar-nav");

    if (sidebar) {
        const linkRect = currentLink.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();

        sidebar.scrollTop += linkRect.top - sidebarRect.top - 100;
    }
}

const languageSelect = document.getElementById("language-select");

const languageDropdown = document.querySelector(".language-dropdown");
const languageButton = languageDropdown.querySelector(".language-dropdown-button");

languageButton.addEventListener("click", () => {
    languageDropdown.classList.toggle("open");
});

document.addEventListener("click", event => {
    if (!languageDropdown.contains(event.target)) {
        languageDropdown.classList.remove("open");
    }
});

languageDropdown.querySelectorAll("[data-language]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const language = link.dataset.language;
        const parts = window.location.pathname.split("/");

        parts[2] = language;

        window.location.href =
            parts.join("/") +
            window.location.search +
            window.location.hash;
    });
});
document.querySelector(".search-container")?.addEventListener("submit", event => {
    event.preventDefault();

    const query = event.currentTarget.elements.q.value.trim();

    if (!query) {
        return;
    }

    const language = getSitePathParts()[0];

    window.location.href =
        `${BASE_PATH}/${language}/search?q=${encodeURIComponent(query)}`;
});

async function performSearch() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q")?.trim();

    const resultsContainer = document.getElementById("search-results");

    if (!resultsContainer || !query) {
        return;
    }

    document.title = `Search: ${query} | Sultan's Archive`;

    const response = await fetch("data.json");
    const searchData = await response.json();

    const queryLower = query.toLowerCase();

    const results = [];

    for (const [id, entry] of Object.entries(searchData)) {
        if (!entry.strings) continue;

        const matches = entry.strings.filter(
            str => str.toLowerCase().includes(queryLower)
        ).slice(0, 3);

        if (matches.length > 0) {
            results.push({
                id,
                title: entry.title,
                link: withBasePath(entry.link),
                strings: matches
            });
        }
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <p class="search-no-results">
                No results found for <strong>${escapeHtml(query)}</strong>.
            </p>
        `;
        return;
    }

    resultsContainer.innerHTML = results
        .map(result => createSearchResult(result.title, result.id, result.link, result.strings, query))
        .join("");
}


function createSearchResult(title, id, url, strings, query) {
    return `
        <section class="search-result">
            <a class="search-result-title" href="${url}">
                ${escapeHtml(title)}
            </a>

            <div class="search-result-matches">
                ${strings.map(str => `
                    <div class="search-result-match">
                        ${createSnippet(str, query)}
                    </div>
                `).join("")}
            </div>
        </section>
    `;
}


function createSnippet(string, query) {
    const lowerString = string.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const matchIndex = lowerString.indexOf(lowerQuery);

    if (matchIndex === -1) {
        return escapeHtml(string);
    }

    const CONTEXT = window.matchMedia("(max-width: 900px)").matches
            ? 30
            : 60;

    let start = Math.max(0, matchIndex - CONTEXT);
    let end = Math.min(
        string.length,
        matchIndex + query.length + CONTEXT
    );

    if (start > 0) {
        const space = string.indexOf(" ", start);

        if (space !== -1 && space < matchIndex) {
            start = space + 1;
        }
    }

    if (end < string.length) {
        const space = string.lastIndexOf(" ", end);

        if (space > matchIndex + query.length) {
            end = space;
        }
    }

    const prefix = start > 0 ? "... " : "";
    const suffix = end < string.length ? " ..." : "";

    const before = string.slice(start, matchIndex);
    const match = string.slice(
        matchIndex,
        matchIndex + query.length
    );
    const after = string.slice(matchIndex + query.length, end);

    return (
        escapeHtml(prefix) +
        escapeHtml(before) +
        `<mark>${escapeHtml(match)}</mark>` +
        escapeHtml(after) +
        escapeHtml(suffix)
    );
}

function escapeHtml(string) {
    return String(string)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

if (document.getElementById("search-results")) {
    performSearch();
}


document.addEventListener("click", event => {
    const button = event.target.closest(".image-version-button");

    if (!button) return;

    const image = document.getElementById(button.dataset.imageId);

    if (!image) return;

    const container = image.closest(".card-image-container");
    const background = container.querySelector(".card-image-background");
    const border = container.querySelector(".card-image-border");

    const altImages = JSON.parse(image.dataset.altImages);
    const rarities = JSON.parse(image.dataset.rarities);

    const totalVersions = altImages.length + 1;

    let version = Number(image.dataset.version);

    version += Number(button.dataset.direction);

    version = (version + totalVersions) % totalVersions;

    image.dataset.version = version;

    image.src = withBasePath(version === 0
        ? image.dataset.original
        : altImages[version - 1]);

    const rarity = rarities[version];

    background.src = withBasePath(`/images/bg/bg_${image.dataset.type}_${rarity}.png`);
    

    if (border) {
        border.src = withBasePath(image.dataset.original);

        if (version > 0) {
            border.src = withBasePath(`/images/bg/bg_char_${rarity}_border.png`);
        }
    }

    const controls = button.closest(".image-version-controls");
    const label = controls.querySelector(".image-version-label");

    label.textContent = version === 0
        ? "Original"
        : `Alt ${version}`;
});