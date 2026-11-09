import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api';
import BakeryPulsePage from '../pages/bakery/BakeryPulsePage';
import BakeryItemsPage from '../pages/bakery/BakeryItemsPage';
import BakeryValidatePage from '../pages/bakery/BakeryValidatePage';
import BakeryHistoryPage from '../pages/bakery/BakeryHistoryPage';
import BakeryTaxPage from '../pages/bakery/BakeryTaxPage';
import BakeryProfilePage from '../pages/bakery/BakeryProfilePage';

const QUICK_PRESETS = [
  {
    icon: '🥖',
    name: '10 Baguettes de Tradition',
    qty: 10,
    cost: 0.45,
    desc: 'Baguettes traditionnelles au levain croustillantes, cuites dans l’après-midi.',
  },
  {
    icon: '🥐',
    name: '8 Croissants & Viennoiseries',
    qty: 8,
    cost: 0.50,
    desc: 'Assortiment de croissants pur beurre et pains au chocolat artisanaux.',
  },
  {
    icon: '🥪',
    name: '5 Sandwiches & Quiches du Jour',
    qty: 5,
    cost: 1.25,
    desc: 'Sandwiches baguette frais (jambon, emmental, crudités) et parts de quiche lorraine.',
  },
  {
    icon: '🍰',
    name: '6 Pâtisseries & Tartes',
    qty: 6,
    cost: 1.10,
    desc: 'Tartelettes aux fruits, éclairs chocolat et choux du jour.',
  },
];

export default function ShopkeeperPortal({
  user,
  currentPath = '/bakery/pulse',
  onNavigatePage,
  onUserUpdate,
}) {
  // Shop details from backend
  const [shopId, setShopId] = useState(null);
  const [bakeryHistory, setBakeryHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Pulse posting state
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [costPrice, setCostPrice] = useState('0.85');
  const [isDonation] = useState(true);
  const [postingPulse, setPostingPulse] = useState(false);
  const [lastPostedPulse, setLastPostedPulse] = useState(null);

  // Validate Claim state
  const [qrTokenInput, setQrTokenInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validatedClaim, setValidatedClaim] = useState(null);

  // Shop profile & cost matrix state
  const [shopName, setShopName] = useState(user?.shop_name || 'Boulangerie Partner');
  const [shopAddress, setShopAddress] = useState(
    user?.shop_address || '51 Rue de Vaugirard, 75015 Paris'
  );
  const [shopPhone, setShopPhone] = useState(user?.phone || '');
  const [shopBio, setShopBio] = useState(user?.bio || '');
  const [lat, setLat] = useState('48.8448');
  const [lng, setLng] = useState('2.3125');
  const [newPassword, setNewPassword] = useState('');
  const [costBaguettes, setCostBaguettes] = useState('0.45');
  const [costCroissants, setCostCroissants] = useState('0.50');
  const [costSandwiches, setCostSandwiches] = useState('1.25');
  const [costPatisseries, setCostPatisseries] = useState('1.10');
  const [savingSettings, setSavingSettings] = useState(false);

  // Tax Report State
  const [taxYear, setTaxYear] = useState('2026');
  const [taxMonth, setTaxMonth] = useState('11');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    fetchShopProfile();
    fetchBakeryHistory();
  }, []);

  useEffect(() => {
    if (
      currentPath === '/bakery/history' ||
      currentPath === '/bakery/validate' ||
      currentPath === '/bakery/pulse' ||
      currentPath === '/bakery/items' ||
      currentPath === '/bakery/tax'
    ) {
      fetchBakeryHistory();
    }
  }, [currentPath]);

  const fetchShopProfile = async () => {
    try {
      const res = await api.getOrUpdateShopCosts({
        inventory_costs: {},
        address: null,
        latitude: null,
        longitude: null,
      });
      if (res.shop_id) {
        setShopId(res.shop_id);
      }
      if (res.address) {
        setShopAddress(res.address);
      }
      if (res.latitude) {
        setLat(String(res.latitude));
      }
      if (res.longitude) {
        setLng(String(res.longitude));
      }
      if (res.inventory_costs) {
        const costs = res.inventory_costs;
        if (costs['Baguette Tradition']?.cost_price !== undefined) {
          setCostBaguettes(String(costs['Baguette Tradition'].cost_price));
        } else if (costs['baguette']?.cost_price !== undefined) {
          setCostBaguettes(String(costs['baguette'].cost_price));
        }
        if (costs['Croissant']?.cost_price !== undefined) {
          setCostCroissants(String(costs['Croissant'].cost_price));
        } else if (costs['croissant']?.cost_price !== undefined) {
          setCostCroissants(String(costs['croissant'].cost_price));
        }
        if (costs['Sandwich']?.cost_price !== undefined) {
          setCostSandwiches(String(costs['Sandwich'].cost_price));
        } else if (costs['sandwich']?.cost_price !== undefined) {
          setCostSandwiches(String(costs['sandwich'].cost_price));
        }
        if (costs['Pâtisserie Fine']?.cost_price !== undefined) {
          setCostPatisseries(String(costs['Pâtisserie Fine'].cost_price));
        }
      }
    } catch (err) {
      console.warn('Shop profile initialization:', err);
    }
  };

  const fetchBakeryHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getBakeryHistory();
      setBakeryHistory(data);
      if (data?.shop_id) setShopId(data.shop_id);
      if (data?.shop_name) setShopName(data.shop_name);
      if (data?.shop_address) setShopAddress(data.shop_address);
      if (data?.phone) setShopPhone(data.phone);
      if (data?.bio) setShopBio(data.bio);
      if (data?.latitude) setLat(String(data.latitude));
      if (data?.longitude) setLng(String(data.longitude));
    } catch (err) {
      console.warn('Failed to fetch bakery history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApplyPreset = (preset) => {
    setItemName(preset.name);
    setQuantity(preset.qty);
    setCostPrice(String(preset.cost));
    setDescription(preset.desc);
    showToast(`Preset "${preset.name}" loaded into form! Ready to broadcast.`);
  };

  const handlePostPulse = async (e) => {
    e?.preventDefault();
    if (!itemName) {
      showToast('Please enter an item name or select a preset.', 'error');
      return;
    }
    setPostingPulse(true);
    try {
      const payload = {
        item_name: itemName,
        description,
        quantity: parseInt(quantity, 10),
        cost_price: parseFloat(costPrice) || 0.85,
        is_donation: isDonation,
      };
      const res = await api.createPulse(payload);
      setLastPostedPulse(res);
      showToast(
        `Pulse broadcasted live to backend database! ${res.notified_students} students alerted.`
      );
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      setItemName('');
      setDescription('');
      fetchBakeryHistory();
    } catch (err) {
      console.error('Backend pulse error:', err);
      showToast(err.message || 'Failed to post surplus pulse.', 'error');
    } finally {
      setPostingPulse(false);
    }
  };

  const handleUpdateItem = async (pulseId, updatePayload) => {
    try {
      await api.updatePulse(pulseId, updatePayload);
      showToast(
        `Item "${updatePayload.item_name || 'Pulse'}" & internal Cerfa tax price updated in PostgreSQL!`
      );
      await fetchBakeryHistory();
      return true;
    } catch (err) {
      console.error('Update item error:', err);
      showToast(err.message || 'Failed to update item.', 'error');
      return false;
    }
  };

  const handleDeleteItem = async (pulseId, itemTitle = 'Item') => {
    try {
      await api.deletePulse(pulseId);
      showToast(`Deleted "${itemTitle}" from your bakery items.`);
      await fetchBakeryHistory();
      return true;
    } catch (err) {
      console.error('Delete item error:', err);
      showToast(err.message || 'Failed to delete item.', 'error');
      return false;
    }
  };

  const executeValidateToken = async (tokenToVerify) => {
    const token = (tokenToVerify || '').trim();
    if (!token) {
      showToast('Please enter or scan a claim QR token.', 'error');
      return;
    }
    setValidating(true);
    try {
      const res = await api.validateClaim(token);
      setValidatedClaim(res);
      showToast('QR Code Verified! Meal collected successfully.');
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
      setQrTokenInput('');
      fetchBakeryHistory();
    } catch (err) {
      console.error('Validate claim error:', err);
      showToast(err.message || 'Claim validation failed. Token invalid or expired.', 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleValidateClaim = async (e) => {
    e?.preventDefault();
    await executeValidateToken(qrTokenInput);
  };

  const handleGeocodeAddress = async () => {
    const q = (shopAddress || '').trim();
    if (!q) return;
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&accept-language=fr`
      );
      const results = await resp.json();
      if (Array.isArray(results) && results.length > 0) {
        setLat(parseFloat(results[0].lat).toFixed(5));
        setLng(parseFloat(results[0].lon).toFixed(5));
        showToast(`GPS coordinates detected for ${q}!`);
      } else {
        showToast('Could not find coordinates for that address.', 'error');
      }
    } catch {
      showToast('Failed to geocode address.', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updatedUser = await api.updateBakeryProfile({
        shop_name: shopName,
        shop_address: shopAddress,
        phone: shopPhone,
        bio: shopBio,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        new_password: newPassword.trim() ? newPassword.trim() : null,
      });
      if (onUserUpdate) {
        onUserUpdate(updatedUser);
      }

      const res = await api.getOrUpdateShopCosts({
        inventory_costs: {
          'Baguette Tradition': {
            cost_price: parseFloat(costBaguettes) || 0.45,
            unit: 'piece',
            currency: 'EUR',
          },
          Croissant: {
            cost_price: parseFloat(costCroissants) || 0.5,
            unit: 'piece',
            currency: 'EUR',
          },
          Sandwich: {
            cost_price: parseFloat(costSandwiches) || 1.25,
            unit: 'piece',
            currency: 'EUR',
          },
          'Pâtisserie Fine': {
            cost_price: parseFloat(costPatisseries) || 1.1,
            unit: 'piece',
            currency: 'EUR',
          },
        },
        address: shopAddress,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      });
      if (res.shop_id) {
        setShopId(res.shop_id);
      }
      setNewPassword('');
      showToast('Bakery profile, coordinates, and inventory costs saved to PostgreSQL!');
      fetchBakeryHistory();
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast(err.message || 'Failed to save shop settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDownloadCerfa = async () => {
    if (!shopId) {
      showToast('Loading shop profile... please try again in a moment.', 'error');
      return;
    }
    setGeneratingReport(true);
    try {
      const blob = await api.generateTaxReport(
        shopId,
        parseInt(taxYear, 10),
        parseInt(taxMonth, 10)
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cerfa_${user?.siret || 'shop'}_${taxYear}_${taxMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('Official Cerfa n° 11580*05 PDF generated by backend and downloaded!');
    } catch (err) {
      console.error('Tax report error:', err);
      showToast(err.message || 'Could not compile Cerfa report from backend.', 'error');
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div className="portal-container">
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Render the Dedicated Bakery Page Component for the Current URL Route */}
      {currentPath === '/bakery/items' ? (
        <BakeryItemsPage
          user={user}
          shopAddress={shopAddress}
          bakeryHistory={bakeryHistory}
          loadingHistory={loadingHistory}
          onRefreshHistory={fetchBakeryHistory}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onNavigatePage={onNavigatePage}
        />
      ) : currentPath === '/bakery/validate' ? (
        <BakeryValidatePage
          qrTokenInput={qrTokenInput}
          setQrTokenInput={setQrTokenInput}
          validating={validating}
          validatedClaim={validatedClaim}
          onValidateClaim={handleValidateClaim}
          onQuickValidateToken={executeValidateToken}
          bakeryHistory={bakeryHistory}
          loadingHistory={loadingHistory}
          onRefreshHistory={fetchBakeryHistory}
          onNavigatePage={onNavigatePage}
        />
      ) : currentPath === '/bakery/history' ? (
        <BakeryHistoryPage
          user={user}
          shopAddress={shopAddress}
          bakeryHistory={bakeryHistory}
          loadingHistory={loadingHistory}
          onRefreshHistory={fetchBakeryHistory}
          onQuickValidateToken={(token) => {
            setQrTokenInput(token);
            executeValidateToken(token);
          }}
          onNavigatePage={onNavigatePage}
        />
      ) : currentPath === '/bakery/tax' ? (
        <BakeryTaxPage
          user={user}
          shopAddress={shopAddress}
          taxYear={taxYear}
          setTaxYear={setTaxYear}
          taxMonth={taxMonth}
          setTaxMonth={setTaxMonth}
          generatingReport={generatingReport}
          onDownloadCerfa={handleDownloadCerfa}
          bakeryHistory={bakeryHistory}
          onNavigatePage={onNavigatePage}
        />
      ) : currentPath === '/bakery/profile' ? (
        <BakeryProfilePage
          user={user}
          shopName={shopName}
          setShopName={setShopName}
          shopAddress={shopAddress}
          setShopAddress={setShopAddress}
          shopPhone={shopPhone}
          setShopPhone={setShopPhone}
          shopBio={shopBio}
          setShopBio={setShopBio}
          lat={lat}
          setLat={setLat}
          lng={lng}
          setLng={setLng}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          costBaguettes={costBaguettes}
          setCostBaguettes={setCostBaguettes}
          costCroissants={costCroissants}
          setCostCroissants={setCostCroissants}
          costSandwiches={costSandwiches}
          setCostSandwiches={setCostSandwiches}
          costPatisseries={costPatisseries}
          setCostPatisseries={setCostPatisseries}
          savingSettings={savingSettings}
          onSaveSettings={handleSaveSettings}
          onGeocodeAddress={handleGeocodeAddress}
          onNavigatePage={onNavigatePage}
        />
      ) : (
        <BakeryPulsePage
          user={user}
          shopAddress={shopAddress}
          presets={QUICK_PRESETS}
          onApplyPreset={handleApplyPreset}
          itemName={itemName}
          setItemName={setItemName}
          quantity={quantity}
          setQuantity={setQuantity}
          costPrice={costPrice}
          setCostPrice={setCostPrice}
          description={description}
          setDescription={setDescription}
          postingPulse={postingPulse}
          onPostPulse={handlePostPulse}
          lastPostedPulse={lastPostedPulse}
          bakeryHistory={bakeryHistory}
          onDeleteItem={handleDeleteItem}
          onNavigatePage={onNavigatePage}
        />
      )}
    </div>
  );
}
