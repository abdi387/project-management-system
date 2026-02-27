// src/pages/faculty-head/VenueManagement.jsx
import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Building2 } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import ConfirmationModal from '../../components/common/ConfirmationModal';

const VenueManagement = () => {
  const { venues, addVenue, removeVenue } = useProject();
  const [newVenueName, setNewVenueName] = useState('');
  const [loading, setLoading] = useState(false);
  const [venueToDelete, setVenueToDelete] = useState(null);

  const handleAddVenue = (e) => {
    e.preventDefault();
    if (!newVenueName.trim()) {
      toast.error('Venue name cannot be empty.');
      return;
    }
    setLoading(true);
    const result = addVenue(newVenueName);
    if (result.success) {
      toast.success(result.message);
      setNewVenueName('');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleRemoveVenue = () => {
    if (venueToDelete) {
      removeVenue(venueToDelete.id);
      toast.success(`Venue "${venueToDelete.name}" removed.`);
      setVenueToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Venues Management</h1>
        <p className="text-gray-500 mt-1">Add, view, and remove defense venues for scheduling.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Venue Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Venue
            </h2>
            <form onSubmit={handleAddVenue} className="space-y-4">
              <InputField
                label="Venue Name"
                id="venueName"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                placeholder="e.g., Main Auditorium"
                required
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Adding...' : 'Add Venue'}
              </Button>
            </form>
          </div>
        </div>

        {/* Venues List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Available Venues ({venues.length})
              </h2>
            </div>
            {venues.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {venues.map((venue) => (
                  <li key={venue.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-800">{venue.name}</span>
                    </div>
                    <Button
                      variant="danger-outline"
                      size="sm"
                      onClick={() => setVenueToDelete(venue)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-10 text-center text-gray-500">
                <MapPin className="w-12 h-12 mx-auto text-gray-300" />
                <p className="mt-4 font-medium">No venues found.</p>
                <p className="text-sm">Use the form to add your first venue.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={!!venueToDelete}
        onClose={() => setVenueToDelete(null)}
        onConfirm={handleRemoveVenue}
        title="Confirm Venue Deletion"
        message={`Are you sure you want to remove the venue "${venueToDelete?.name}"? This action cannot be undone.`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
};

export default VenueManagement;