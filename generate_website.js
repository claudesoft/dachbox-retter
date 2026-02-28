const fs = require('fs');
const path = require('path');

function slugify(text) {
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

function escapeJsonString(str) {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function buildJsonLdProduct(data, page) {
    const product = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `Dachbox-Feder-Blocker für ${page.manufacturer} ${page.model}`,
        "description": `Mechanischer Feder-Blocker für schwache Gasfedern der ${page.manufacturer} ${page.model} Dachbox. Günstige Alternative zum teuren Gasfeder-Austausch.`,
        "image": "https://selfmade.lu/img1.jpg",
        "brand": { "@type": "Brand", "name": "Dachbox-Retter" },
        "offers": {
            "@type": "Offer",
            "price": "14.95",
            "priceCurrency": "EUR",
            "availability": "https://schema.org/InStock",
            "url": data.shopLink,
            "shippingDetails": data.shippingCountries.map(c => ({
                "@type": "OfferShippingDetails",
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": c.code
                },
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": c.price === "Kostenlos" ? "0" : c.price.replace(' €', '').replace(',', '.'),
                    "currency": "EUR"
                }
            }))
        }
    };
    return `<script type="application/ld+json">${JSON.stringify(product)}</script>`;
}

function buildJsonLdFaq(data) {
    const faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": data.faqs.map(f => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": f.answer
            }
        }))
    };
    return `<script type="application/ld+json">${JSON.stringify(faq)}</script>`;
}

function buildShippingCountriesHtml(countries) {
    return countries.map(c => `
        <div class="shipping-country">
            <span class="flag">${c.flag}</span>
            <span class="details"><strong>${c.country}</strong>: ${c.price}</span>
            <span class="days">(${c.days})</span>
        </div>
    `).join('');
}

function buildComparisonsHtml(comparisons) {
    return comparisons.map(c => `
        <tr>
            <td><strong>${c.method}</strong></td>
            <td style="color: #dc2626;">${c.risk}</td>
            <td style="color: #059669;">${c.advantage}</td>
        </tr>
    `).join('');
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

        const jsonLdFaq = buildJsonLdFaq(data);
        const shippingCountriesHtml = buildShippingCountriesHtml(data.shippingCountries);
        const comparisonsHtml = buildComparisonsHtml(data.comparisons);

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

            const pageMetaDesc = `${page.manufacturer} ${page.model} Dachbox Gasfeder schwach? Der Feder-Blocker hält den Deckel sicher offen — günstige Alternative zum Gasfeder-Austausch. Versand nach LU, DE, FR, BE.`;

            const jsonLdProduct = buildJsonLdProduct(data, page);

            const replacements = {
                ...data,
                pageTitle: `${data.productName} für ${page.manufacturer} ${page.model} | Dachbox-Retter`,
                metaDescription: pageMetaDesc,
                canonical: page.filename,
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
                shippingCountriesHtml: shippingCountriesHtml,
                jsonLdProduct: jsonLdProduct,
                jsonLdFaq: jsonLdFaq,
                introduction: `Ihre ${page.manufacturer} Dachbox (Modell ${page.model}) bleibt nicht mehr zuverlässig offen? Anstatt die teuren Original-Gasfedern (ca. ${page.specs.force || '90N'}) für viel Geld auszutauschen, ist unser Blocker die ideale Lösung, wenn Sie die Box nur gelegentlich (z.B. 1-2 mal im Jahr für den Urlaub) nutzen. Da die Box in 99% der Zeit ohnehin geschlossen ist, reicht dieser mechanische Helfer völlig aus.`
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

            const faqsHtml = data.faqs.map(f => `
                <div style="margin-bottom: 1.5rem;">
                    <strong style="display: block; font-size: 1.1rem; color: #111827; margin-bottom: 0.25rem;">${f.question}</strong>
                    <p style="margin: 0; color: #4b5563;">${f.answer}</p>
                </div>
            `).join('');
            html = html.replace('{{faqs}}', faqsHtml);

            html = html.replace('{{comparisons}}', comparisonsHtml);

            fs.writeFileSync(path.join(__dirname, page.filename), html);
        });

        console.log(`✅ ${pages.length} Shop-Seiten generiert.`);
    } catch (err) { console.error(err); }
}

build();
