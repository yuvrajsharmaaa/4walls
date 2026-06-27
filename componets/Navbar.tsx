import { useState } from "react";
import { Box, Menu, X } from "lucide-react";
import Button from "../componets/ui/button";

interface NavbarProps {
  isSignedIn: boolean;
  username: string | null;
  signIn: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
}

const Navbar = ({ isSignedIn, username, signIn, signOut }: NavbarProps) => {
    const navItems = ["Products", "Pricing", "Community", "Enterprise"];
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const handleAuthClick = async () => {
        if (isSignedIn) {
            try {
                await signOut();
            } catch (error) {
                console.error("Error signing out:", error);
            }
            return;
        }

        try {
            await signIn();
        } catch (error) {
            console.error("Error signing in:", error);
        }
    };

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className="navbar">
            <div className="navbar-inner">
                <a href="/" className="navbar-logo" aria-label="4Wall home">
                    <span className="navbar-logo-mark">
                        <Box className="h-4 w-4" />
                    </span>
                    <span>4Wall</span>
                </a>

                <nav aria-label="Primary" className="navbar-desktop-nav">
                    <ul className="navbar-links">
                        {navItems.map((item) => (
                            <li key={item}>
                                <a href={`/${item.toLowerCase()}`}>{item}</a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="navbar-actions">
                    {isSignedIn ? (
                        <>
                            
                            <span className="greetings ml-2">
                                {username ? `Hi, ${username}!` : "Hi there!"}
                            </span>

                            <Button
                                variant="secondary"
                                onClick={handleAuthClick}
                                className="navbar-logout"
                            >
                                Log out
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="secondary"
                                className="navbar-login"
                                onClick={handleAuthClick}
                            >
                                Log in
                            </Button>

                           <Button
                                variant="primary"
                                className="navbar-signup"
                                onClick={handleAuthClick}
                            >
                                Sign up
                            </Button>
                        </>
                    )}

                    <button
                        type="button"
                        className="navbar-menu-button"
                        aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-navigation"
                        onClick={() => setIsMenuOpen((open) => !open)}
                    >
                        {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div
                id="mobile-navigation"
                className={`navbar-mobile-menu${isMenuOpen ? " is-open" : ""}`}
            >

                <nav aria-label="Mobile primary navigation">
                    <ul className="navbar-mobile-links">
                    {navItems.map((item) => (
                        <li key={item}>
                            <a href={`/${item.toLowerCase()}`} onClick={closeMenu}>
                                {item}
                            </a>
                        </li>
                    ))}
                    </ul>
                </nav>

                <div className="navbar-mobile-actions">
                    {isSignedIn ? (
                        <>
                            <span className="greetings ml-2">
                                {username ? `Hi, ${username}!` : "Hi there!"}
                            </span>

                            <Button
                                variant="secondary"
                                onClick={handleAuthClick}
                                className="navbar-logout"
                            >
                                Log out
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="secondary"
                                onClick={handleAuthClick}
                            >
                                Log in
                            </Button>

                            <Button
                                variant="primary"
                                onClick={handleAuthClick}
                            >
                                Sign up
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;