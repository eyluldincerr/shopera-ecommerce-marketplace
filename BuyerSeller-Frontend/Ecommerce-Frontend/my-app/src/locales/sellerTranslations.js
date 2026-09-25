const sellerTranslations = {
  en: {
    common: {
      retry: "Try again",
      retrying: "Trying again...",
      errorTitle: "We could not load this seller feature",
      errorDescription: "Please try again. Your saved data has not been changed.",
      emptyTitle: "Nothing to show yet",
      storeRequiredTitle: "Create a store first",
      storeRequiredDescription:
        "A store is required before you can manage products or inventory.",
    },
    sidebar: {
      sellerNavigation: "Seller navigation",
      noStore: "Create your store",
      unreadNotifications: "{{count}} unread notifications",
      accountProfile: "Account Profile",
      storeMedia: "Stories & Videos",
    },
    storeMediaPage: {
      title: "Stories & Videos",
      description: "Publish short-lived homepage stories or permanent videos for your public store.",
      viewStore: "View public store",
      homepageTitle: "Homepage stories",
      homepageDescription: "Visible for 24 hours. You can have up to 2 active stories at a time.",
      videosTitle: "Store videos",
      videosDescription: "Stay on your Store page until you remove them.",
      loadingTitle: "Loading stories and videos",
    },
    storeProfile: {
      createStore: "Set up store profile",
      noStoreDescription:
        "Complete your store profile before publishing products.",
      notSubmitted: "Not submitted",
      inactive: "Inactive",
      returnPolicyText:
        "Returns are handled according to the store's published return terms.",
    },
    notifications: {
      markAsRead: "Mark as read",
      loading: "Loading notifications...",
      loadError: "Notifications could not be loaded.",
      unknownTitle: "Seller notification",
      unknownDescription: "A seller event was recorded.",
      actions: {
        viewOrder: "View order",
        viewReview: "View review",
        viewInventory: "View inventory",
        dismiss: "No action available",
      },
    },
    products: {
      variants: "Variants",
      variantCount: "{{count}} variants",
      addVariant: "Add variant",
      removeVariant: "Remove variant",
      removeVariantConfirm: "Remove variant {{sku}}?",
      variantOptions: "Option values",
      variantOptionsPlaceholder: "Color: Black, Size: M",
      variantSku: "Variant SKU",
      variantPrice: "Variant price",
      variantCostPrice: "Variant cost",
      variantStock: "Variant stock",
      variantStatus: "Variant status",
      atLeastOneVariant: "Add at least one sellable variant.",
      duplicateSku: "Each variant SKU must be unique.",
      duplicateVariantCombination:
        "Each size, color, and storage combination must be unique.",
      conditionDescriptionRequired:
        "Describe the condition when the product is not new.",
      invalidImages:
        "Use valid image URLs, unique positive display positions, and at most one primary image.",
      invalidProduct:
        "Check the required fields and the maximum field lengths.",
      invalidProductInfo:
        "Product details, specification groups, and box contents must contain item lists.",
      invalidVariant:
        "Complete every variant with a unique SKU and valid non-negative price, cost, and stock values.",
    },
  },
  tr: {
    common: {
      retry: "Tekrar dene",
      retrying: "Tekrar deneniyor...",
      errorTitle: "Satıcı özelliği yüklenemedi",
      errorDescription:
        "Lütfen tekrar deneyin. Kaydedilmiş verileriniz değiştirilmedi.",
      emptyTitle: "Henüz gösterilecek bir şey yok",
      storeRequiredTitle: "Önce bir mağaza oluşturun",
      storeRequiredDescription:
        "Ürün veya stok yönetebilmek için bir mağaza gereklidir.",
    },
    sidebar: {
      sellerNavigation: "Satıcı menüsü",
      noStore: "Mağazanızı oluşturun",
      unreadNotifications: "{{count}} okunmamış bildirim",
      accountProfile: "Hesap Profili",
      storeMedia: "Hikâyeler ve Videolar",
    },
    storeMediaPage: {
      title: "Hikâyeler ve Videolar",
      description: "Ana sayfada kısa süreli hikâyeler veya mağazanızda kalıcı videolar yayınlayın.",
      viewStore: "Herkese açık mağazayı görüntüle",
      homepageTitle: "Ana sayfa hikâyeleri",
      homepageDescription: "24 saat görünür. Aynı anda en fazla 2 aktif hikâye yayınlayabilirsiniz.",
      videosTitle: "Mağaza videoları",
      videosDescription: "Siz kaldırana kadar Mağaza sayfanızda kalır.",
      loadingTitle: "Hikâyeler ve videolar yükleniyor",
    },
    storeProfile: {
      createStore: "Mağaza profilini oluştur",
      noStoreDescription:
        "Ürün yayınlamadan önce mağaza profilinizi tamamlayın.",
      notSubmitted: "Gönderilmedi",
      inactive: "Pasif",
      returnPolicyText:
        "İadeler mağazanın yayınlanmış iade koşullarına göre işleme alınır.",
    },
    notifications: {
      markAsRead: "Okundu olarak işaretle",
      loading: "Bildirimler yükleniyor...",
      loadError: "Bildirimler yüklenemedi.",
      unknownTitle: "Satıcı bildirimi",
      unknownDescription: "Bir satıcı olayı kaydedildi.",
      actions: {
        viewOrder: "Siparişi görüntüle",
        viewReview: "Değerlendirmeyi görüntüle",
        viewInventory: "Stoku görüntüle",
        dismiss: "Kullanılabilir işlem yok",
      },
    },
    products: {
      variants: "Varyantlar",
      variantCount: "{{count}} varyant",
      addVariant: "Varyant ekle",
      removeVariant: "Varyantı kaldır",
      removeVariantConfirm: "{{sku}} varyantı kaldırılsın mı?",
      variantOptions: "Seçenek değerleri",
      variantOptionsPlaceholder: "Renk: Siyah, Beden: M",
      variantSku: "Varyant SKU",
      variantPrice: "Varyant fiyatı",
      variantCostPrice: "Varyant maliyeti",
      variantStock: "Varyant stoğu",
      variantStatus: "Varyant durumu",
      atLeastOneVariant: "En az bir satılabilir varyant ekleyin.",
      duplicateSku: "Her varyant SKU değeri benzersiz olmalıdır.",
      duplicateVariantCombination:
        "Her beden, renk ve depolama kombinasyonu benzersiz olmalıdır.",
      conditionDescriptionRequired:
        "Ürün yeni değilse durumunu açıklayın.",
      invalidImages:
        "Geçerli görsel URL'leri, benzersiz pozitif sıralar ve en fazla bir ana görsel kullanın.",
      invalidProduct:
        "Zorunlu alanları ve alan uzunluklarını kontrol edin.",
      invalidProductInfo:
        "Ürün detayları, özellik grupları ve kutu içeriği öğe listeleri içermelidir.",
      invalidVariant:
        "Her varyant için benzersiz SKU ve geçerli, negatif olmayan fiyat, maliyet ve stok değerleri girin.",
    },
  },
};

export default sellerTranslations;
