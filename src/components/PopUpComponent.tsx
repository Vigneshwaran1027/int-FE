// import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, Key } from "react";
import { usePopup } from "./PopUpContext";

export const PopUp: React.FC = () => {
    const {  currentDocument, currentWordCloud } = usePopup();
  
    console.log("INSIDE POPUP COMPONENT");
    
    // if (!isPopupOpen) return null;

    return(
<div>
  {/* <meta charSet="UTF-8" />
  <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>USClaims | Login</title>
  <link rel="icon" type="image/x-icon" href="assets/images/favicon.ico" />
  <link rel="stylesheet" href="assets/scss/custom.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" /> */}
  {/* Button trigger modal */}
  {/* <button type="button" className="btn btn-primary m-3" data-bs-toggle="modal" data-bs-target="#staticBackdrop">
    Attorney Document
  </button>
  Modal */}
  <div className="modal fade" id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex={-1} aria-labelledby="staticBackdropLabel" aria-hidden="true">
    <div className="modal-dialog modal-lg ">
      <div className="modal-content">
        <div className="modal-header">
          <h1 className="modal-title fs-5" id="staticBackdropLabel">
            <div className="btn-group w-75">
              <button className="btn dropdown-toggle border-0 p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              {currentDocument}
              </button>
              <ul className="dropdown-menu w-100">
              {currentWordCloud?.locations.map((location: { documentName: string }, index ) => (
                    <li key={index}><a className="dropdown-item" href="#">{location.documentName}</a></li>
                  ))}
              </ul>
            </div>
          </h1>
          <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
        </div>
        <div className="modal-body">
          <div className="d-flex justify-content-between">
            <div className="grey-v1">Showing result for:<span className="text-black"> {currentWordCloud?.word}</span></div>
            <div>
              <span className="grey-v1 me-2">{currentWordCloud?.locations.length ? `1/${currentWordCloud.locations.length} Results` : '0/0 Results'}</span>
              <a href="#"><i className="bi bi-chevron-up me-2" /></a>
              <a href="#"><i className="bi bi-chevron-down" /></a>
            </div>
          </div>
          <div className="mt-3">
            <iframe src="pdf/xlscout.pdf" width="100%" height="500px" style={{"border":"none"}} />
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
    )
}