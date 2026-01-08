import React from 'react';

// Define the shape of the toast message
export interface ToastMessageState {
  show: boolean;
  message: string;
  success: boolean;
}

interface ToastMessageProps {
  toastMsg: ToastMessageState;
  setToastMsg: React.Dispatch<React.SetStateAction<ToastMessageState>>;
}

const ToastMsg: React.FC<ToastMessageProps> = ({ toastMsg, setToastMsg }) => {
  // Auto-hide toast after 6 seconds
  React.useEffect(() => {
    if (toastMsg.show) {
      const timer = setTimeout(() => {
        setToastMsg({ ...toastMsg, show: false });
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [toastMsg.show, setToastMsg]);

  // Determine styles/icons based on success/error
  // const toastTypeClass = toastMsg.success ? 'bg-success' : 'bg-danger';
  const iconSrc = toastMsg.success
    ? 'assets/images/toastalert.svg'
    : 'assets/images/toastalert.svg';
  const headerText = toastMsg.success ? 'Success' : 'Try Again';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="position-fixed top-0 start-50 translate-middle-x p-3"
      style={{ zIndex: 1050 }}
    >
      <div className={`toast ${toastMsg.show ? 'show' : ''}`} role="alert" aria-live="assertive" aria-atomic="true">
        <div className={`toast-header d-flex align-items-center`}>
          <img src={iconSrc} className="rounded me-2" alt="status-icon" width="20" />
          <strong className="me-auto">{headerText}</strong>
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="toast"
            aria-label="Close"
            onClick={() => setToastMsg({ ...toastMsg, show: false })}
          ></button>
        </div>
        <div className="toast-body ps-5 pt-1">
          {toastMsg.message || "Something went wrong. Please try again."}
        </div>
      </div>
    </div>
  );
};

export default ToastMsg;