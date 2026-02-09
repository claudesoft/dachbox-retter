const fs = require('fs');
const path = require('path');

function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-');    // Replace multiple - with single -
}

async function build() {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'website_data.json'), 'utf8'));
        const templateStr = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        const pages = [];

        // 1. Prepare general page (index.html)
        pages.push({
            filename: 'index.html',
            title: data.mainHeading,
            activeManufacturer: null,
            activeModel: null
        });

        // 2. Prepare pages for each model
        data.manufacturers.forEach(m => {
            m.models.forEach(model => {
                pages.push({
                    filename: `${slugify(m.name)}-${slugify(model)}.html`,
                    title: `${data.productName} für ${m.name} ${model}`,
                    activeManufacturer: m.name,
                    activeModel: model
                });
            });
        });

        // 3. Generate each page
        pages.forEach(page => {
            let html = templateStr;

            // Generate Sidebar HTML for this specific page
            const sidebarHtml = data.manufacturers.map(m => {
                const isExpanded = m.name === page.activeManufacturer;
                const modelListHtml = m.models.map(model => {
                    const isActive = m.name === page.activeManufacturer && model === page.activeModel;
                    const link = `${slugify(m.name)}-${slugify(model)}.html`;
                    return `<li class="nav-item ${isActive ? 'active' : ''}"><a href="${link}">${model}</a></li>`;
                }).join('');

                return `
                <div class="nav-group ${isExpanded ? 'expanded' : ''}">
                    <div class="nav-title">${m.name}</div>
                    <ul class="nav-list">
                        ${modelListHtml}
                    </ul>
                </div>`;
            }).join('');

            // Replace Placeholders
            const replacements = {
                ...data,
                mainHeading: page.activeModel ? `Dachbox-Retter für ${page.activeManufacturer} ${page.activeModel}` : data.mainHeading,
                pageTitle: page.activeModel ? `${data.productName} für ${page.activeManufacturer} ${page.activeModel} | Dachbox-Retter` : data.pageTitle,
                sidebar: sidebarHtml
            };

            const placeholders = [
                'pageTitle', 'metaDescription', 'metaKeywords', 'productName',
                'mainHeading', 'subHeading', 'introduction', 'callToAction', 
                'buttonText', 'disclaimer', 'sidebar'
            ];

            placeholders.forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, replacements[key]);
            });

            const benefitsHtml = data.benefits.map(b => `
                <div class="card">
                    <h3>${b.title}</h3>
                    <p>${b.description}</p>
                </div>
            `).join('');

            html = html.replace('{{benefits}}', benefitsHtml);

            fs.writeFileSync(path.join(__dirname, page.filename), html);
        });

        console.log(`✅ ${pages.length} Seiten wurden erfolgreich generiert.`);
    } catch (err) {
        console.error('❌ Fehler beim Generieren:', err);
    }
}

build();