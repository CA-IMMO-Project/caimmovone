/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';
import Home from '../features/home/Home';
import Lands from '../features/catalog/Lands';
import LandDetail from '../features/catalog/LandDetail';
import SearchRequest from '../features/search/SearchRequest';
import About from '../features/about/About';
import NotFound from '../shared/NotFound';
import Account from '../features/account/Account';
import Auth from '../features/auth/Auth';
import Sell from '../features/sell/Sell';
import Realisations from '../features/realisations/Realisations';
import AdminLayout, { AdminLogin } from '../admin/AdminLayout';
import Dashboard from '../admin/Dashboard';
import AdminLands from '../admin/AdminLands';
import { AdminMessages } from '../admin/AdminRequests';
import { BuyRequestDetail, BuyRequestForm, BuyRequestList } from '../admin/BuyRequests';
import { LandFileDetail, LandFileForm, LandFileList } from '../admin/LandFiles';
import { ClientDetail, ClientList } from '../admin/Clients';
import { SearchDetail, SearchList } from '../admin/Searches';
import AdminRealisations from '../admin/Realisations';
import Agenda from '../admin/Agenda';

/** Remonte en haut de page à chaque changement de route (comportement attendu d'un site). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-brand-50 text-brand-900 font-sans">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/terrains" element={<Lands />} />
          <Route path="/terrains/:id" element={<LandDetail />} />
          <Route path="/recherche" element={<SearchRequest />} />
          <Route path="/about" element={<About />} />
          {/* Contact (formulaire) supprimé : « Nous contacter » ouvre WhatsApp directement */}
          <Route path="/contact" element={<Navigate to="/" replace />} />
          <Route path="/connexion" element={<Auth />} />
          <Route path="/vendre" element={<Sell />} />
          <Route path="/reservation" element={<Navigate to="/vendre" replace />} />
          <Route path="/realisations" element={<Realisations />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Espace client : plein écran, même gabarit que le backoffice */}
        <Route path="/compte" element={<Account />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="terrains" element={<AdminLands />} />
          <Route path="achats" element={<BuyRequestList />} />
          <Route path="achats/nouveau" element={<BuyRequestForm />} />
          <Route path="achats/:id" element={<BuyRequestDetail />} />
          <Route path="achats/:id/modifier" element={<BuyRequestForm key="edit" />} />
          <Route path="dossiers-terrains" element={<LandFileList />} />
          <Route path="dossiers-terrains/nouveau" element={<LandFileForm />} />
          <Route path="dossiers-terrains/:id" element={<LandFileDetail />} />
          <Route path="dossiers-terrains/:id/modifier" element={<LandFileForm key="edit" />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="recherches" element={<SearchList />} />
          <Route path="recherches/:id" element={<SearchDetail />} />
          <Route path="realisations" element={<AdminRealisations />} />
          <Route path="messages" element={<AdminMessages />} />
        </Route>
      </Routes>
    </Router>
  );
}
