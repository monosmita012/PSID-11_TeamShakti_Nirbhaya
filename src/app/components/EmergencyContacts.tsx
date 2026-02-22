import { useState, useEffect } from "react";
import { AlertTriangle, User, Plus, Trash2, Edit2, Save, X, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ref, set, onValue, remove, get } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface Guardian {
  id: string;
  name: string;
  phone: string;
  isPrimary?: boolean;
}

export default function EmergencyContacts() {
  const auth = getAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingGuardian, setIsAddingGuardian] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    relationship: ""
  });
  const [guardianFormData, setGuardianFormData] = useState({
    name: "",
    phone: ""
  });

  // Fetch emergency contacts and guardians
  useEffect(() => {
    if (!auth.currentUser) return;

    const contactsRef = ref(database, `emergency_contacts/${auth.currentUser.uid}`);
    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const contactsList = Object.entries(data).map(([id, contact]: [string, any]) => ({
          id,
          ...contact
        }));
        setContacts(contactsList);
      } else {
        setContacts([]);
      }
    });

    // Fetch registered guardian and additional guardians from user profile
    const userRef = ref(database, `users/${auth.currentUser.uid}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      const guardianList: Guardian[] = [];
      
      // Add primary guardian from registration
      if (data && data.guardianName && data.guardianPhone) {
        guardianList.push({
          id: 'primary',
          name: data.guardianName,
          phone: data.guardianPhone,
          isPrimary: true
        });
      }
      
      // Add additional guardians
      if (data && data.additionalGuardians) {
        Object.entries(data.additionalGuardians).forEach(([id, guardian]: [string, any]) => {
          guardianList.push({
            id,
            name: guardian.name,
            phone: guardian.phone,
            isPrimary: false
          });
        });
      }
      
      setGuardians(guardianList);
    });

    return () => {
      unsubscribe();
      unsubscribeUser();
    };
  }, [auth.currentUser]);

  const handleAddContact = async () => {
    if (!auth.currentUser || !formData.name || !formData.phone) return;

    const newContact: EmergencyContact = {
      id: `contact_${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      relationship: formData.relationship
    };

    await set(
      ref(database, `emergency_contacts/${auth.currentUser.uid}/${newContact.id}`),
      newContact
    );

    setFormData({ name: "", phone: "", relationship: "" });
    setIsAdding(false);
  };

  const handleUpdateContact = async (id: string) => {
    if (!auth.currentUser) return;

    await set(
      ref(database, `emergency_contacts/${auth.currentUser.uid}/${id}`),
      {
        id,
        name: formData.name,
        phone: formData.phone,
        relationship: formData.relationship
      }
    );

    setEditingId(null);
    setFormData({ name: "", phone: "", relationship: "" });
  };

  const handleDeleteContact = async (id: string) => {
    if (!auth.currentUser) return;
    await remove(ref(database, `emergency_contacts/${auth.currentUser.uid}/${id}`));
  };

  // Guardian handlers
  const handleAddGuardian = async () => {
    if (!auth.currentUser || !guardianFormData.name || !guardianFormData.phone) return;

    const newGuardianId = `guardian_${Date.now()}`;
    
    await set(
      ref(database, `users/${auth.currentUser.uid}/additionalGuardians/${newGuardianId}`),
      {
        name: guardianFormData.name,
        phone: guardianFormData.phone
      }
    );

    setGuardianFormData({ name: "", phone: "" });
    setIsAddingGuardian(false);
  };

  const handleUpdateGuardian = async (id: string) => {
    if (!auth.currentUser || id === 'primary') return;

    await set(
      ref(database, `users/${auth.currentUser.uid}/additionalGuardians/${id}`),
      {
        name: guardianFormData.name,
        phone: guardianFormData.phone
      }
    );

    setEditingGuardianId(null);
    setGuardianFormData({ name: "", phone: "" });
  };

  const handleDeleteGuardian = async (id: string) => {
    if (!auth.currentUser || id === 'primary') return;
    await remove(ref(database, `users/${auth.currentUser.uid}/additionalGuardians/${id}`));
  };

  const startEditContact = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship
    });
  };

  const startEditGuardian = (guardian: Guardian) => {
    setEditingGuardianId(guardian.id);
    setGuardianFormData({
      name: guardian.name,
      phone: guardian.phone
    });
  };

  const cancelEditContact = () => {
    setEditingId(null);
    setFormData({ name: "", phone: "", relationship: "" });
  };

  const cancelEditGuardian = () => {
    setEditingGuardianId(null);
    setGuardianFormData({ name: "", phone: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Emergency Contacts
        </CardTitle>
        <CardDescription>
          Quick access to your emergency contacts during crisis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          
          {/* Guardians Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Guardians
            </h3>
            
            {/* Add Guardian Button */}
            {!isAddingGuardian && (
              <Button
                onClick={() => setIsAddingGuardian(true)}
                variant="outline"
                className="w-full flex items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="w-4 h-4" />
                Add Guardian
              </Button>
            )}

            {/* Add Guardian Form */}
            {isAddingGuardian && (
              <div className="p-4 border border-blue-200 rounded-lg space-y-3 bg-blue-50">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">Guardian Name</Label>
                  <Input
                    id="guardianName"
                    placeholder="Guardian name"
                    value={guardianFormData.name}
                    onChange={(e) => setGuardianFormData({ ...guardianFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Phone Number</Label>
                  <Input
                    id="guardianPhone"
                    type="tel"
                    placeholder="Phone number"
                    value={guardianFormData.phone}
                    onChange={(e) => setGuardianFormData({ ...guardianFormData, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddGuardian} size="sm" className="bg-blue-500 hover:bg-blue-600">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button onClick={() => setIsAddingGuardian(false)} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Guardians List */}
            <div className="space-y-2">
              {guardians.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No guardians added</p>
                </div>
              ) : (
                guardians.map((guardian) => (
                  <div
                    key={guardian.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${guardian.isPrimary ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
                  >
                    {editingGuardianId === guardian.id ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Name"
                          value={guardianFormData.name}
                          onChange={(e) => setGuardianFormData({ ...guardianFormData, name: e.target.value })}
                        />
                        <Input
                          type="tel"
                          placeholder="Phone"
                          value={guardianFormData.phone}
                          onChange={(e) => setGuardianFormData({ ...guardianFormData, phone: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateGuardian(guardian.id)}
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button onClick={cancelEditGuardian} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{guardian.name}</span>
                            {guardian.isPrimary && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Primary</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {guardian.phone}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!guardian.isPrimary && (
                            <>
                              <Button
                                onClick={() => startEditGuardian(guardian)}
                                size="sm"
                                variant="outline"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteGuardian(guardian.id)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Other Emergency Contacts Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-500" />
              Other Emergency Contacts
            </h3>
            
            {/* Add Contact Button */}
            {!isAdding && (
              <Button
                onClick={() => setIsAdding(true)}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Emergency Contact
              </Button>
            )}

            {/* Add Contact Form */}
            {isAdding && (
              <div className="p-4 border rounded-lg space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Contact name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    placeholder="e.g., Parent, Friend, Sibling"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddContact} size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button onClick={() => setIsAdding(false)} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Contacts List */}
            <div className="space-y-2">
              {contacts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <Phone className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No additional emergency contacts</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    {editingId === contact.id ? (
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                          type="tel"
                          placeholder="Phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                          placeholder="Relationship"
                          value={formData.relationship}
                          onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleUpdateContact(contact.id)}
                            size="sm"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button onClick={cancelEditContact} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{contact.name}</span>
                            {contact.relationship && (
                              <span className="text-sm text-gray-500">({contact.relationship})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">{contact.phone}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => startEditContact(contact)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteContact(contact.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
