import { useState, useEffect } from "react";
import { Phone, User, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ref, set, onValue, remove } from "firebase/database";
import { database } from "../firebase-config";
import { getAuth } from "firebase/auth";

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export default function EmergencyContacts() {
  const auth = getAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    relationship: ""
  });

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
      }
    });

    return () => unsubscribe();
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

  const handleCallContact = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", phone: "", relationship: "" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Emergency Contacts
        </CardTitle>
        <CardDescription>
          Quick access to your emergency contacts during crisis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
              <div className="text-center py-8 text-gray-500">
                <Phone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No emergency contacts added</p>
                <p className="text-sm">Add contacts for quick access during emergencies</p>
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
                        <Button onClick={cancelEdit} variant="outline" size="sm">
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
                          onClick={() => handleCallContact(contact.phone)}
                          size="sm"
                          variant="outline"
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => startEdit(contact)}
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
      </CardContent>
    </Card>
  );
}
