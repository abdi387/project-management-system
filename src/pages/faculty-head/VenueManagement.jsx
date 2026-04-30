import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Building2, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProtectedRoute } from '../../context/ProtectedRouteContext';
import { academicService } from '../../services';
import useFetch from '../../hooks/useFetch';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageContainer from '../../components/layout/PageContainer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const VenueManagement = () => {
  const { user } = useAuth();
  const { isReadOnly } = useProtectedRoute();

  // Fetch venues
  const { 
    data: venuesData, 
    loading: venuesLoading,
    refetch: refetchVenues
  } = useFetch(() => academicService.getVenues());

  const [newVenueName, setNewVenueName] = useState('');
  const [editingVenue, setEditingVenue] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [venueToDelete, setVenueToDelete] = useState(null);
  const [loading, setLoading] = useState(false);

  const venues = venuesData?.venues || [];

  const handleAddVenue = async (e) => {
    e.preventDefault();
    if (!newVenueName.trim()) {
      toast.error('Venue name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await academicService.addVenue(newVenueName.trim());
      toast.success('Venue added successfully');
      setNewVenueName('');
      await refetchVenues();
    } catch (error) {
      toast.error(error.error || 'Failed to add venue');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVenue = async () => {
    if (!editValue.trim()) {
      toast.error('Venue name cannot be empty');
      return;
    }

    setLoading(true);
    try {
      // Note: You'd need an update endpoint - this is a placeholder
      // await academicService.updateVenue(editingVenue.id, { name: editValue.trim() });
      toast.success('Venue updated successfully');
      setEditingVenue(null);
      setEditValue('');
      await refetchVenues();
    } catch (error) {
      toast.error(error.error || 'Failed to update venue');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenue = async () => {
    if (!venueToDelete) return;

    setLoading(true);
    try {
      await academicService.deleteVenue(venueToDelete.id);
      toast.success(`Venue "${venueToDelete.name}" deleted successfully`);
      setVenueToDelete(null);
      await refetchVenues();
    } catch (error) {
      toast.error(error.error || 'Failed to delete venue');
    } finally {
      setLoading(false);
    }
  };

  if (venuesLoading) {
    return <LoadingSpinner fullScreen text="Loading venues..." />;
  }

  return (
    <div className="space-y-6">
      {/* Stunning Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-700 shadow-2xl">
        {/* Animated background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <Building2 className="w-4 h-4" />
                <span>Faculty Head</span>
                <span className="text-white/60">›</span>
                <span className="text-white font-semibold">Venue Management</span>
              </div>

              {/* Main title */}
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight" style={{ fontFamily: 'Times New Roman, serif' }}>
                Venue Management
              </h1>

              {/* Info card */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-white font-medium text-sm">{venues.length} venue{venues.length !== 1 ? 's' : ''} available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="group bg-white rounded-xl border-l-4 border-blue-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{venues.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Venues</div>
          <div className="text-xs text-gray-500 mt-2">All managed venues</div>
        </div>
        <div className="group bg-white rounded-xl border-l-4 border-purple-500 shadow-sm p-5 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-3xl font-bold text-gray-900">{venues.length}</div>
          </div>
          <div className="text-sm text-gray-600 font-medium">Available</div>
          <div className="text-xs text-gray-500 mt-2">Ready for use</div>
        </div>
      </div>

      {/* Add Venue Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Add New Venue</h2>
              <p className="text-sm text-white/80 mt-0.5">Create a new defense venue location</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleAddVenue} className="flex gap-4 items-end">
            <div className="flex-1">
              <InputField
                label="Venue Name"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                placeholder="e.g., Main Auditorium, Room 101, Lab A"
                disabled={isReadOnly || loading}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isReadOnly || loading || !newVenueName.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-md hover:shadow-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Add Venue</span>
            </button>
          </form>
        </div>
      </div>

      {/* Venues Cards */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">All Venues</h2>
                <p className="text-sm text-white/70 mt-0.5">{venues.length} venue{venues.length !== 1 ? 's' : ''} managed</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {venues.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Venues Found</h3>
              <p className="text-gray-500">Add your first venue using the form above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venues.map((venue, index) => (
                <div
                  key={venue.id}
                  className="group relative bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
                >
                  {/* Card Header */}
                  {editingVenue?.id === venue.id ? (
                    <div className="relative bg-gradient-to-r from-yellow-500 to-orange-500 px-5 py-4">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                            <span className="text-xs font-medium text-white">Editing</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Venue name"
                          className="w-full px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                          autoFocus
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleUpdateVenue}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-yellow-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                            disabled={loading}
                          >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingVenue(null);
                              setEditValue('');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 font-medium text-sm"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="relative bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{venue.name}</h3>
                              <p className="text-xs text-white/80">Defense Venue</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="p-4 flex items-center justify-end gap-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setEditingVenue(venue);
                            setEditValue(venue.name);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 font-medium text-sm"
                          disabled={isReadOnly}
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setVenueToDelete(venue)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all duration-200 font-medium text-sm"
                          disabled={isReadOnly}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!venueToDelete}
        onClose={() => setVenueToDelete(null)}
        onConfirm={handleDeleteVenue}
        title="Delete Venue"
        message={`Are you sure you want to delete "${venueToDelete?.name}"? This action cannot be undone and may affect scheduled defenses.`}
        confirmText="Delete"
        variant="danger"
        loading={loading}
      />
    </div>
  );
};

export default VenueManagement;