import logo from '/public/USClaims-logo.png'; 
import logo2 from '/public/logo_SVG.svg'
function Loader() {
    return (
        <div
            className="loader-container flex-column"
            style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh', // Optional: Center vertically on the page
            }}
        >
            <div
                className="load bg-white rounded-4 p-5 d-flex justify-content-center align-items-center"
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                {/* Rotating circular loading animation */}
                <img
                    src={logo} // Use the imported image
                    alt="Loading"
                    style={{
                        width: '60px',
                        height: '60px',
                        animation: 'spin 2s linear infinite', // Apply the rotation animation
                    }}
                    onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        // if (!img.src.includes('data:image/svg+xml')) {
                        //     img.src = logo2 }
                        img.onerror = null;
                        img.src = logo2;
                    }}
                />
            </div>
            <p className="text-white fw-semibold fs-3">Processing</p>
        </div>
    );
}

// Define the keyframes for the rotation animation
const styles = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Inject the styles into the document
document.head.appendChild(document.createElement('style')).textContent = styles;

export default Loader;