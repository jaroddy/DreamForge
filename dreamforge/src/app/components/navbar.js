'use client'

import React, { useContext, useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from '../context/authContext';
import { useRouter } from 'next/navigation';



/**
 * Navbar component that displays the logo, navigation links, and user profile dropdown.
 * @returns {JSX.Element} The Navbar component.
 */
const NavBar = () => {
  const [isDropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const [shopName, setShopName] = useState("");
  const { currentUser, logout } = useAuth();
  const router = useRouter();

  /**
   * Handles clicks outside of the user profile dropdown to close it.
   * @param {MouseEvent} event - The click event.
   */
  const handleDocumentClick = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setDropdownVisible(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };




  return (
    <nav className="bg-blue-500 pb-3 pt-3 relative z-50">
      <div className="container mx-auto flex items-center justify-between py-2">
        <div className="flex items-center">

          {/* Logo */}
          <Link href={'/'}>
            <Image
              src={'/images/logo.png'}
              width={70}
              alt="logo"
              height={70}
            />
          </Link>


        </div>

        {/* User Info and Logout */}
        {currentUser && (
          <div className="flex items-center space-x-4">
            <span className="text-white font-medium">{currentUser.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-blue-500 rounded-lg font-bold transition duration-300"
            >
              Logout
            </button>
          </div>
        )}

      </div>
    </nav>
  );
};

export default NavBar;
