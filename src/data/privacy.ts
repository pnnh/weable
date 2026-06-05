import type { LangKey } from "@/lib/language";

interface PrivacySection {
    heading: string;
    body: string;
}

export interface PrivacyContent {
    title: string;
    lastUpdated: string;
    intro: string;
    sections: PrivacySection[];
}

export const privacyContent: Record<LangKey, PrivacyContent> = {
    en: {
        title: "Privacy Policy",
        lastUpdated: "Last updated: April 20, 2026",
        intro:
            "Weable (weable.cc) is a collection of free, browser-based mini-games and an image sharing platform. Your privacy matters to us. This policy explains what data is stored or processed when you use our site.",
        sections: [
            {
                heading: "Data We Collect",
                body: "When you use Weable's image sharing features, we store uploaded images and associated metadata (title, description) on our servers. Games run entirely in your browser and do not transmit gameplay data.",
            },
            {
                heading: "Browser Storage (localStorage)",
                body: "Our tools store your language preference as a functionally necessary setting; this does not require consent and contains no personal data. All locally stored data lives entirely on your device and is never transmitted to us.",
            },
            {
                heading: "Cookies",
                body: "This site does not set tracking or advertising cookies. When you respond to the cookie consent notice, a cookie named cookie-consent is stored to remember your preference. Our hosting infrastructure (Cloudflare) may set minimal technical cookies for security and performance.",
            },
            {
                heading: "Your Rights (GDPR / ePrivacy)",
                body: "If you are in the European Economic Area (EEA), you have rights under the GDPR, including the right to access, correct, or erase data held about you. For any privacy concerns, please contact us.",
            },
            {
                heading: "Changes to This Policy",
                body: "We may update this policy from time to time. Any changes will be reflected on this page with an updated date at the top.",
            },
            {
                heading: "Contact",
                body: "If you have questions about this privacy policy, please contact us at: privacy@weable.cc",
            },
        ],
    },
    zh: {
        title: "隐私政策",
        lastUpdated: "最后更新：2026 年 4 月 20 日",
        intro:
            "Weable (weable.cc) 是一个免费的在线小游戏和图片分享平台。您的隐私对我们很重要。本政策说明我们在您使用本网站时存储或处理哪些数据。",
        sections: [
            {
                heading: "我们收集的数据",
                body: "当您使用 Weable 的图片分享功能时，我们会在服务器上存储上传的图片及相关元数据（标题、描述）。游戏完全在您的浏览器中运行，不会传输游戏数据。",
            },
            {
                heading: "浏览器存储（localStorage）",
                body: "我们的工具将您的语言偏好存储为功能必需的设置；这不需要同意且不包含个人数据。所有本地存储的数据完全保留在您的设备上，绝不会传输给我们。",
            },
            {
                heading: "Cookies",
                body: "本网站不设置跟踪或广告 Cookie。当您回应 Cookie 同意通知时，会存储一个名为 cookie-consent 的 Cookie 来记住您的偏好。我们的托管基础设施 (Cloudflare) 可能会设置最少的安全和性能相关技术 Cookie。",
            },
            {
                heading: "您的权利（GDPR / ePrivacy）",
                body: "如果您在欧洲经济区 (EEA)，您在 GDPR 下拥有访问、更正或删除您数据的权利。如有任何隐私问题，请与我们联系。",
            },
            {
                heading: "政策变更",
                body: "我们可能会不时更新本政策。任何更改都将反映在此页面并更新日期。",
            },
            {
                heading: "联系方式",
                body: "如您对本隐私政策有任何疑问，请通过以下方式联系我们：privacy@weable.cc",
            },
        ],
    },
    es: {
        title: "Política de privacidad",
        lastUpdated: "Última actualización: 20 de abril de 2026",
        intro:
            "Weable (weable.cc) es una colección de minijuegos gratuitos y una plataforma para compartir imágenes. Tu privacidad nos importa.",
        sections: [
            { heading: "Datos que recopilamos", body: "Al usar las funciones de imagen, almacenamos las imágenes subidas y metadatos en nuestros servidores. Los juegos se ejecutan completamente en tu navegador." },
            { heading: "Almacenamiento del navegador", body: "Almacenamos tu preferencia de idioma localmente en tu dispositivo." },
            { heading: "Cookies", body: "No usamos cookies de seguimiento. Cloudflare puede establecer cookies técnicas." },
            { heading: "Tus derechos (RGPD)", body: "Si estás en el EEE, tienes derechos bajo el RGPD. Contáctanos para cualquier solicitud." },
            { heading: "Cambios", body: "Podemos actualizar esta política. Los cambios se reflejarán aquí." },
            { heading: "Contacto", body: "privacy@weable.cc" },
        ],
    },
    fr: {
        title: "Politique de confidentialité",
        lastUpdated: "Dernière mise à jour : 20 avril 2026",
        intro:
            "Weable (weable.cc) est une collection de mini-jeux gratuits et une plateforme de partage d'images. Votre vie privée nous importe.",
        sections: [
            { heading: "Données collectées", body: "Lors de l'utilisation des fonctionnalités d'images, nous stockons les images et métadonnées sur nos serveurs. Les jeux s'exécutent entièrement dans votre navigateur." },
            { heading: "Stockage navigateur", body: "Nous stockons votre préférence linguistique localement sur votre appareil." },
            { heading: "Cookies", body: "Pas de cookies de suivi. Cloudflare peut définir des cookies techniques." },
            { heading: "Vos droits (RGPD)", body: "Si vous êtes dans l'EEE, vous avez des droits sous le RGPD. Contactez-nous pour toute demande." },
            { heading: "Modifications", body: "Nous pouvons mettre à jour cette politique. Les changements seront reflétés ici." },
            { heading: "Contact", body: "privacy@weable.cc" },
        ],
    },
    "de-DE": {
        title: "Datenschutzerklärung",
        lastUpdated: "Zuletzt aktualisiert: 20. April 2026",
        intro:
            "Weable (weable.cc) ist eine Sammlung kostenloser Mini-Spiele und eine Bildteilungsplattform. Ihre Privatsphäre ist uns wichtig.",
        sections: [
            { heading: "Erhobene Daten", body: "Bei der Nutzung der Bildfunktionen speichern wir hochgeladene Bilder und Metadaten auf unseren Servern. Spiele laufen vollständig in Ihrem Browser." },
            { heading: "Browser-Speicher", body: "Wir speichern Ihre Spracheinstellung lokal auf Ihrem Gerät." },
            { heading: "Cookies", body: "Keine Tracking-Cookies. Cloudflare kann technische Cookies setzen." },
            { heading: "Ihre Rechte (DSGVO)", body: "Im EWR haben Sie Rechte nach der DSGVO. Kontaktieren Sie uns bei Anfragen." },
            { heading: "Änderungen", body: "Wir können diese Richtlinie aktualisieren. Änderungen werden hier angezeigt." },
            { heading: "Kontakt", body: "privacy@weable.cc" },
        ],
    },
    "pt-PT": {
        title: "Política de Privacidade",
        lastUpdated: "Última atualização: 20 de abril de 2026",
        intro:
            "Weable (weable.cc) é uma coleção de mini-jogos gratuitos e plataforma de partilha de imagens. A sua privacidade é importante para nós.",
        sections: [
            { heading: "Dados recolhidos", body: "Ao usar funcionalidades de imagem, armazenamos imagens e metadados nos nossos servidores. Jogos executam inteiramente no seu navegador." },
            { heading: "Armazenamento do navegador", body: "Armazenamos a sua preferência de idioma localmente no seu dispositivo." },
            { heading: "Cookies", body: "Sem cookies de rastreio. Cloudflare pode definir cookies técnicos." },
            { heading: "Seus direitos (RGPD)", body: "No EEE, tem direitos sob o RGPD. Contacte-nos para qualquer pedido." },
            { heading: "Alterações", body: "Podemos atualizar esta política. As alterações serão refletidas aqui." },
            { heading: "Contacto", body: "privacy@weable.cc" },
        ],
    },
    ja: {
        title: "プライバシーポリシー",
        lastUpdated: "最終更新日: 2026年4月20日",
        intro:
            "Weable (weable.cc) は無料のオンラインミニゲームと画像共有プラットフォームです。お客様のプライバシーを大切にしています。",
        sections: [
            { heading: "収集するデータ", body: "画像共有機能をご利用の際、アップロードされた画像とメタデータをサーバーに保存します。ゲームはブラウザ内で完全に動作します。" },
            { heading: "ブラウザストレージ", body: "言語設定をお使いのデバイスにローカル保存します。" },
            { heading: "Cookie", body: "トラッキングCookieは使用しません。Cloudflareが技術的なCookieを設定する場合があります。" },
            { heading: "お客様の権利（GDPR）", body: "EEAにお住まいの方はGDPRに基づく権利を有します。お問い合わせください。" },
            { heading: "変更", body: "本ポリシーを随時更新する場合があります。変更はこのページに反映されます。" },
            { heading: "お問い合わせ", body: "privacy@weable.cc" },
        ],
    },
    "zh-TW": {
        title: "隱私政策",
        lastUpdated: "最後更新：2026 年 4 月 20 日",
        intro:
            "Weable (weable.cc) 是免費的線上小遊戲和圖片分享平台。您的隱私對我們很重要。",
        sections: [
            { heading: "我們收集的資料", body: "使用圖片分享功能時，我們會在伺服器上儲存上傳的圖片及相關中繼資料。遊戲完全在您的瀏覽器中執行。" },
            { heading: "瀏覽器儲存", body: "我們將您的語言偏好儲存在您的裝置上。" },
            { heading: "Cookies", body: "不使用追蹤 Cookie。Cloudflare 可能設置技術性 Cookie。" },
            { heading: "您的權利（GDPR）", body: "如果您在 EEA，您擁有 GDPR 規定的權利。請聯繫我們。" },
            { heading: "變更", body: "我們可能更新此政策。變更將反映在此頁面。" },
            { heading: "聯繫方式", body: "privacy@weable.cc" },
        ],
    },
};
