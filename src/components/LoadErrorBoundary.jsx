import { Component } from 'react';
import { isChunkLoadError, recoverChunkLoad } from '../utils/chunkRecovery.js';

export default class LoadErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    recoverChunkLoad(error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <section role="alert" className="p-6 text-text">
        <h2 className="text-xl font-bold">Sadržaj trenutno nije dostupan</h2>
        <p className="my-3">{isChunkLoadError(error)
          ? 'Nije moguće učitati deo sajta. Proverite internet vezu i ponovo učitajte stranicu.'
          : 'Došlo je do greške pri prikazu. Ponovo učitajte stranicu.'}</p>
        <button type="button" className="underline" onClick={() => window.location.reload()}>Ponovo učitaj</button>
      </section>
    );
  }
}
