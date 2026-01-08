interface ToastMessageProps {
  message: string;
}

export const ToastMessage: React.FC<ToastMessageProps> = ({ message }) => {

  console.log(message,"TOASTMESSAGE COMPONENT");
  
  
  return (


    <div aria-live="polite" aria-atomic="true" className="d-flex justify-content-center align-items-center w-100 top-0 start-50 toast-container translate-middle-x">
    {/* Then put toasts within */}
    <div className="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div className="toast-header border-0">
        <img src="assets/images/toastalert.svg" className="rounded me-2" alt="..." />
        <strong className="me-auto">Try Again </strong>
        <button type="button" className="btn-close" data-bs-dismiss="toast" aria-label="Close" />
      </div>
      <div className="toast-body ps-5 pt-1">
      {message}
      </div>
    </div>
  </div>
  



  );
}
