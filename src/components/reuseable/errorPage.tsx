
import React from 'react';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import '../../css'
import '../../css/custom.min.css'

const ErrorPage: React.FC = () => {
  return (
    <div>
      <nav className="navbar navbar-expand-lg">
        <div className="d-flex justify-content-between w-100">
          <a className="navbar-brand" href="index.html">
            <img src="assets/images/usclaims-logo.svg" alt="Logo" />
          </a>
          <div className="d-flex" role="search">
            <ul className="nav">
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <img src="assets/images/user-profile.svg" alt="user profile image" />
                </a>
                <ul className="dropdown-menu profile-dropdown">
                  <li><a className="dropdown-item" href="#"><i className="bi bi-person me-1"></i>Joanna Clark</a></li>
                  <li><a className="dropdown-item text-danger" href="login.html"><i className="bi bi-box-arrow-right me-1"></i>Logout</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container-fluid error-page-container">
        <div className="row d-flex flex-column align-items-center justify-content-center h-100">
          {/* 404 Error Section */}
          <div className="col-md-8 mx-auto d-none">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h3 className="mb-3">Oops....</h3>
                <p className="mb-3">Page not found</p>
                <p className="text-secondary">This page doesn’t exist or was removed! We suggest you back to home.</p>
                <a className="btn btn-primary" href="index.html"><i className="bi bi-arrow-left"></i> Back to Home</a>
              </div>
              <div className="col-md-6">
                <img src="assets/images/error404.svg" className="img-fluid" alt="404 Error" />
              </div>
            </div>
          </div>

          {/* 500 Error Section */}
          <div className="col-md-8 mx-auto">
            <div className="row align-items-center">
              <div className="col-md-6">
                <h3 className="mb-3">Oops....</h3>
                <p className="mb-3">Internal Server Error</p>
                <p className="text-secondary">We apologize for the inconvenience. Please try again later.</p>
              </div>
              <div className="col-md-6">
                <img src="assets/images/error500.svg" className="img-fluid" alt="500 Error" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* No script tags needed in React components */}
    </div>
  );
};

export default ErrorPage;
