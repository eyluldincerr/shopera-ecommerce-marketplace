import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import Navbar from "../components/layout/Navbar";
import useAuthSession from "../hooks/useAuthSession.js";
import { getNotFoundAction } from "../routes/routePolicy.js";

function NotFoundPage() {
  const { t } = useTranslation();
  const session = useAuthSession();
  const action = getNotFoundAction(session?.role);

  return (
    <>
      <Navbar />

      <main className="not-found-page">
        <section className="container not-found-page__content shopera-card">
          <span className="not-found-page__code">404</span>
          <h1>{t("notFound.title")}</h1>
          <p>{t("notFound.description")}</p>
          <Link to={action.to} className="shopera-primary-button">
            {t(action.labelKey)}
          </Link>
        </section>
      </main>
    </>
  );
}

export default NotFoundPage;
