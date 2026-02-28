const fs = require('fs');
const path = require('path');

function slugify(text) {
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

async function build() {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'website_data.json'), 'utf8'));
        const templateStr = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        const pages = [];
        pages.push({ filename: 'index.html', title: 'Startseite', manufacturer: 'Universal', model: 'Alle Modelle', specs: {} });

        data.manufacturers.forEach(m => {
            m.models.forEach(modelObj => {
                const modelName = typeof modelObj === 'string' ? modelObj : modelObj.name;
                const modelSpecs = modelObj.specs || {};
                const combinedSpecs = { ...m.defaultSpecs, ...modelSpecs };
                const variants = modelObj.variants || [];
                
                pages.push({
                    filename: `${slugify(m.name)}-${slugify(modelName)}.html`,
                    manufacturer: m.name,
                    model: modelName,
                    specs: combinedSpecs,
                    variants: variants
                });
            });
        });

        pages.forEach(page => {
            let html = templateStr;

            const sidebarHtml = data.manufacturers.map(m => {
                const isExpanded = m.name === page.manufacturer;
                const modelListHtml = m.models.map(modelObj => {
                    const mName = typeof modelObj === 'string' ? modelObj : modelObj.name;
                    const isActive = m.name === page.manufacturer && mName === page.model;
                    return `<li class="nav-item ${isActive ? 'active' : ''}"><a href="${slugify(m.name)}-${slugify(mName)}.html">${mName}</a></li>`;
                }).join('');

                return `<div class="nav-group ${isExpanded ? 'expanded' : ''}"><div class="nav-title">${m.name}</div><ul class="nav-list">${modelListHtml}</ul></div>`;
            }).join('');

            let variantsHtml = '';
            if (page.variants && page.variants.length > 0) {
                variantsHtml = `
                    <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 2rem;">
                        <strong style="display: block; margin-bottom: 0.5rem; color: #475569;">Verfügbare Modell-Varianten:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${page.variants.map(v => `<span style="background: white; padding: 0.2rem 0.6rem; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 0.85rem;">${v}</span>`).join('')}
                        </div>
                        <p style="font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; margin-bottom: 0;">Unser Blocker ist für alle oben genannten ${page.model}-Varianten passend.</p>
                    </div>
                `;
            }

            const replacements = {
                ...data,
                pageTitle: `${data.productName} für ${page.manufacturer} ${page.model} | Dachbox-Retter`,
                manufacturer: page.manufacturer,
                model: page.model,
                springCount: page.specs.springs || '2',
                force: page.specs.force || '90N',
                rodDiameter: page.specs.rod || '8mm',
                cylinderDiameter: page.specs.cylinder || '18mm',
                extendedLength: page.specs.length || '280mm',
                blockerLength: page.specs.blocker || '100mm',
                sidebar: sidebarHtml,
                variantsList: variantsHtml,
                introduction: `Ihre ${page.manufacturer} Dachbox (Modell ${page.model}) bleibt nicht mehr zuverlässig offen? Anstatt die teuren Original-Gasfedern (ca. ${page.specs.force || '90N'}) für viel Geld auszutauschen, ist unser Blocker die perfekte Lösung. Da die Box in 99% der Zeit ohnehin geschlossen ist, reicht dieser mechanische Helfer völlig aus.`
            };

            Object.keys(replacements).forEach(key => {
                if (typeof replacements[key] === 'string' || typeof replacements[key] === 'number') {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    html = html.replace(regex, replacements[key]);
                }
            });

            const benefitsHtml = data.benefits.map(b => `
                <div class="benefit-card">
                    <h3>${b.title}</h3>
                    <p>${b.description}</p>
                </div>
            `).join('');
            html = html.replace('{{benefits}}', benefitsHtml);

            fs.writeFileSync(path.join(__dirname, 'public', page.filename), html);
        });

        console.log(`✅ ${pages.length} Shop-Seiten im Ordner 'public' generiert.`);
    } catch (err) { console.error(err); }
}

build();