import { useStorefront } from '../localization/StorefrontContext.jsx';
import React from "react";
import "./Breadcrumbs.css";
import { Link } from "react-router-dom";

export default function Breadcrumbs({ trail }) {
  const { t: translateText } = useStorefront();

  return (
    <div className="breadcrumbs">
      <Link to="/">{translateText("Početak")}</Link>
      {trail?.map((t, i) => (
        <span key={i}>
          / <Link to={t.href || "#"}>{translateText(t.label)}</Link>
        </span>
      ))}
    </div>
  );
}
