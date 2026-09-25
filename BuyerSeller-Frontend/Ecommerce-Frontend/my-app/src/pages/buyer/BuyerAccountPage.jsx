import BuyerAccountLayout from "../../components/account/BuyerAccountLayout";

const activePathByTitle = {
  "My Orders": "/orders",
  "My Coupons": "/account/coupons",
  "Help & Support": "/account/support",
};

function BuyerAccountPage({ title }) {
  return (
    <BuyerAccountLayout activePath={activePathByTitle[title]}>
      <div className="buyer-account-page">
        <section className="buyer-account-page__panel">
          <p className="buyer-account-page__eyebrow">My Account</p>
          <h1>{title}</h1>
          <p>
            This protected buyer page is ready for the account details UI.
          </p>
        </section>
      </div>
    </BuyerAccountLayout>
  );
}

export default BuyerAccountPage;
