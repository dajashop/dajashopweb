import React from 'react';
import './WatchFinder.css';
import { Link } from 'react-router-dom';
import WatchFinder from '../components/WatchFinder.jsx';
import SEOHead from '../components/seo/SEOHead.jsx';
import { seoConfig } from '../config/seo.js';
import { ArrowLeft } from 'lucide-react';

export default function WatchFinderPage() {
  return (
    <div className="wf-page">
      <SEOHead
        title="Watch Finder"
        description={seoConfig.siteDescription}
        keywords={seoConfig.siteKeywords}
        type="website"
      />

      <div className="wf-page__header">
        <div className="wf-page__meta">
          <Link to="/" className="wf-page__back">
            <ArrowLeft size={16} /> Početna
          </Link>
          <p className="eyebrow">Watch Finder</p>
          <h1>Odgovori kratko, pronađi tačno.</h1>
          <p className="lede">
            Kviz sa nekoliko pitanja koji ti daje predloge satova po stilu, budžetu i funkcijama.
          </p>
        </div>
      </div>

      <div className="wf-page__body">
        <div className="wf-page__container">
          <WatchFinder
            autoStart
            fullWidth
            showIntro={false}
            layout="stack"
            variant="dark"
            className="wf-page__finder"
          />
        </div>
      </div>
    </div>
  );
}
