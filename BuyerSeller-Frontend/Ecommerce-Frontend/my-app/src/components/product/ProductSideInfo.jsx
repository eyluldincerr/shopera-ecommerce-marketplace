import { useTranslation } from "react-i18next";

function ProductSideInfo({ title, items = [], description = "" }) {
  const { t } = useTranslation();

  return (
    <aside className="product-side-card">
      <h3>{title}</h3>

      {description ? (
        <p className="product-side-card__policy">{description}</p>
      ) : (
        <div className="product-side-card__list">
        {items.map((item) => (
          <div key={item.id} className="product-side-card__item">
            <span>{item.icon}</span>

            <div>
              <strong>{item.titleKey ? t(item.titleKey) : item.title}</strong>
              <p>
                {item.descriptionKey
                  ? t(item.descriptionKey)
                  : item.description}
              </p>
            </div>
          </div>
        ))}
        </div>
      )}
    </aside>
  );
}

export default ProductSideInfo;
