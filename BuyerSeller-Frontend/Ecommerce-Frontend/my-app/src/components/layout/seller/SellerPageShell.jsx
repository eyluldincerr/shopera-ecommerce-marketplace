import Navbar from "../Navbar";
import SellerLayout from "./SellerLayout";

function SellerPageShell({ children }) {
  return (
    <div className="seller-dashboard-shell">
      <Navbar />
      <SellerLayout>{children}</SellerLayout>
    </div>
  );
}

export default SellerPageShell;
