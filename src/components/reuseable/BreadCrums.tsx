import React from "react";
import { BreadCrumbsProps, NavigationItem } from "../../interface/Interface";
import { useNavigate } from "react-router-dom";

export const BreadCrumbs: React.FC<BreadCrumbsProps> = (props) => {
    const [breadCrumbs, setBreadcrumbs] = React.useState<NavigationItem[]>([]);
    const navigate = useNavigate();

    React.useEffect(() => {
        setBreadcrumbs(props.data);
    }, [props.data]);

    const titleClick = (breadcrumb: NavigationItem) => {
        if (isInternalLink(breadcrumb.path)) {
            // For internal routes
            navigate(breadcrumb.path, { 
                state: breadcrumb.state || {},
                replace: false // or true if you want to replace history
            });
        } else {
            // For external URLs or special cases
            const newWindow = window.open(breadcrumb.path, '_blank');
            newWindow?.focus();
        }
    };
    
    // Helper function to determine if a link is internal
    const isInternalLink = (path: string): boolean => {
        return !path.startsWith('http') && !path.startsWith('mailto') && !path.startsWith('tel');
    };
    return (

    <nav
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{["--bs-breadcrumb-divider" as any]: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\'%3E%3Cpath d=\'M2.5 0L1 1.5 3.5 4 1 6.5 2.5 8l4-4-4-4z\' fill=\'%236c757d\'/%3E%3C/svg%3E")'}}aria-label="breadcrumb">
        <ol className="breadcrumb">
                {breadCrumbs.map((breadcrumb, index) => {
                    return breadcrumb.isActive ? (
                    <li style={{cursor:"pointer"}} key={index} className="breadcrumb-item"><a onClick={() => { titleClick(breadcrumb) }}>{breadcrumb.title}</a></li>
                ) : (
                    <li style={{cursor:"pointer"}} key={index} className="breadcrumb-item">{breadcrumb.title}</li>
                );
            })}
        </ol>
    </nav>
    )}