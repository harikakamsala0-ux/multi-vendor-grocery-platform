import { Navigate } from "react-router-dom";

/**
 * Payment is handled on the Cart page (Proceed to pay → review → success).
 * This route keeps old links working.
 */
const Checkout = () => <Navigate to="/cart" replace />;

export default Checkout;
