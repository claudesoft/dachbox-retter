const fs = require('fs');
const path = require('path');

async function build() {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'website_data.json'), 'utf8'));
        let template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        // Simple Template Engine
        const placeholders = [
            'pageTitle', 'metaDescription', 'metaKeywords', 'productName',
            'mainHeading', 'subHeading', 'introduction', 'callToAction', 
            'buttonText', 'disclaimer'
        ];

        placeholders.forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            template = template.replace(regex, data[key]);
        });

        const benefitsHtml = data.benefits.map(b => `
            <div class="card">
                <h3>${b.title}</h3>
                <p>${b.description}</p>
            </div>
        `).join('');

        template = template.replace('{{benefits}}', benefitsHtml);

        fs.writeFileSync(path.join(__dirname, 'index.html'), template);
        console.log('✅ SEO & AI optimierte Seite wurde erfolgreich generiert: index.html');
    } catch (err) {
        console.error('❌ Fehler beim Generieren:', err);
    }
}

build();