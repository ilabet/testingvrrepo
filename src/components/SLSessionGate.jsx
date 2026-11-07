import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export function getSlSession() {
  try {
    return JSON.parse(localStorage.getItem("sl_session") || "null");
  } catch {
    return null;
  }
}

export default function SLSessionGate() {
  return getSlSession() ? <Outlet /> : <Navigate to="/sl-login" replace />;
}