import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import OptionsModal from '../components/OptionsModal';
import ErrorText from '../components/ErrorText';
import { unitConversion, pluralizeUnit } from '../utils/UnitConversion';
import {
  fetchShoppingLists,
  createShoppingList,
  deleteShoppingList,
  clearAllItems,
  clearCheckedItems,
  addShoppingItem,
  toggleShoppingItem,
} from '../utils/shoppingListApi';

const CATEGORY_ORDER = [
  'frozen', 'produce', 'dairy', 'meat_seafood', 'bakery',
  'pantry', 'beverages', 'cleaning', 'housewares', 'health_personal', 'other',
];
const CATEGORY_LABELS = {
  frozen: 'Frozen',
  produce: 'Produce',
  dairy: 'Dairy',
  meat_seafood: 'Meat/Seafood',
  bakery: 'Bakery',
  pantry: 'Pantry',
  beverages: 'Beverages',
  cleaning: 'Cleaning',
  housewares: 'Housewares',
  health_personal: 'Health & Personal Care',
  other: 'Other',
};

const CROSS_OFF_DELAY = 450;

function ShoppingList() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedListId, setSelectedListId] = useState(null);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [itemInput, setItemInput] = useState('');
  const [pendingIds, setPendingIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchShoppingLists()
      .then((data) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      })
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedList = lists.find((l) => l.id === selectedListId) || null;

  const replaceList = (updated) => {
    setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed || creating) return;
    setError(null);
    setCreating(true);
    try {
      const created = await createShoppingList(trimmed);
      setLists((prev) => [...prev, created]);
      setSelectedListId(created.id);
      setNewListName('');
      setShowNewListInput(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;
    setError(null);
    try {
      await deleteShoppingList(selectedList.id);
      const remaining = lists.filter((l) => l.id !== selectedList.id);
      setLists(remaining);
      setSelectedListId(remaining.length > 0 ? remaining[0].id : null);
      setShowDeleteModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearAll = async () => {
    if (!selectedList) return;
    setError(null);
    try {
      const updated = await clearAllItems(selectedList.id);
      replaceList(updated);
      setShowDeleteModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClearChecked = async () => {
    if (!selectedList) return;
    setError(null);
    try {
      const updated = await clearCheckedItems(selectedList.id);
      replaceList(updated);
      setShowDeleteModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const applyToggledItem = (updatedItem) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== selectedListId
          ? l
          : { ...l, items: l.items.map((i) => (i.id === updatedItem.id ? updatedItem : i)) }
      )
    );
  };

  const clearPending = (itemId) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleToggleItem = (item) => {
    setError(null);
    //moving a already checked back to list
    if (item.is_checked) {
      toggleShoppingItem(item.id, false).then(applyToggledItem).catch((err) => setError(err.message));
      return;
    }

    //checking off an item (has a delay for animation)
    setPendingIds((prev) => new Set(prev).add(item.id));
    setTimeout(() => {
      toggleShoppingItem(item.id, true)
        .then((updatedItem) => {
          applyToggledItem(updatedItem);
          clearPending(item.id);
        })
        .catch((err) => {
          setError(err.message);
          clearPending(item.id);
        });
    }, CROSS_OFF_DELAY);
  };

  const handleAddItem = async () => {
    const trimmed = itemInput.trim();
    if (!trimmed || !selectedList) return;
    setError(null);
    try {
      const created = await addShoppingItem(selectedList.id, trimmed);
      setItemInput('');
      setLists((prev) =>
        prev.map((l) => (l.id !== selectedListId ? l : { ...l, items: [...l.items, created] }))
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const uncheckedByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: (selectedList?.items || []).filter((i) => !i.is_checked && i.category === category),
  })).filter((group) => group.items.length > 0);

  const checkedItems = (selectedList?.items || [])
    .filter((i) => i.is_checked)
    .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));

  const itemLabel = (item) =>
    item.amount != null
      ? `${unitConversion(item.amount)} ${pluralizeUnit(item.unit, item.amount)} ${item.name}`.replace(/\s+/g, ' ').trim()
      : item.name;

  return (
    <div className="m-1 pb-20">
      <PageHeader title="Shopping List" backTo="/" />

      <ErrorText>{error}</ErrorText>

      {!loading && lists.length === 0 && !showNewListInput && (
        <div className="text-center mt-8">
          <p className="text-dark-green text-body-1 mb-3">You don't have any shopping lists yet.</p>
          <button
            type="button"
            onClick={() => setShowNewListInput(true)}
            className="bg-blue hover:bg-blue-dark text-beige px-3 py-1 rounded-full cursor-pointer text-body-2"
          >
            + New List
          </button>
        </div>
      )}

      {lists.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <CustomSelect
              value={selectedListId != null ? String(selectedListId) : ''}
              onChange={(val) => setSelectedListId(Number(val))}
              options={lists.map((l) => ({ value: String(l.id), label: l.name }))}
              size="compact"
              ariaLabel="Shopping list"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNewListInput((s) => !s)}
            aria-label="Add list"
            className="shrink-0 bg-blue hover:bg-blue-dark text-beige rounded-full p-1 flex items-center justify-center cursor-pointer"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            aria-label="List options"
            className="shrink-0 text-blue hover:text-blue-dark cursor-pointer"
          >
            <Trash2 size={20} />
          </button>
        </div>
      )}

      {showNewListInput && (
        <div className="flex gap-1 mb-3">
          <input
            type="text"
            placeholder="List name"
            aria-label="List name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            autoFocus
            className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleCreateList}
            disabled={creating}
            className="bg-blue hover:bg-blue-dark text-beige px-3 rounded-lg cursor-pointer text-body-2 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      )}

      <AnimatePresence initial={false} mode="popLayout">
        {uncheckedByCategory.map(({ category, items }) => (
          <motion.div key={category} layout exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="mb-4">
            <h2 className="text-dark-green text-h4 mb-1">{CATEGORY_LABELS[category]}</h2>
            <div className="flex flex-col gap-1">
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((item) => {
                  const crossedOff = pendingIds.has(item.id);
                  return (
                    <motion.label
                      key={item.id}
                      layout
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-center gap-2 text-body-1 cursor-pointer transition-opacity duration-300 ${
                        crossedOff ? 'text-dark-green opacity-60 line-through' : 'text-dark-green'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={crossedOff || item.is_checked}
                        disabled={crossedOff}
                        onChange={() => handleToggleItem(item)}
                        className="w-2 h-2 accent-blue cursor-pointer"
                      />
                      {itemLabel(item)}
                    </motion.label>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {checkedItems.length > 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setCheckedOpen((s) => !s)}
            className="flex items-center gap-1 text-dark-green text-h4 mb-1 cursor-pointer"
          >
            {checkedOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            Checked off items
          </button>
          {checkedOpen && (
            <div className="flex flex-col gap-1">
              <AnimatePresence initial={false} mode="popLayout">
                {checkedItems.map((item) => (
                  <motion.label
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 text-dark-green opacity-60 line-through text-body-1 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.is_checked}
                      onChange={() => handleToggleItem(item)}
                      className="w-2 h-2 accent-blue cursor-pointer"
                    />
                    {itemLabel(item)}
                  </motion.label>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      <OptionsModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="List Options"
        options={[
          { label: 'Clear list', onClick: handleClearAll },
          { label: 'Clear marked items', onClick: handleClearChecked },
          { label: 'Delete list', onClick: handleDeleteList, destructive: true },
        ]}
      />

      {selectedList && (
        <div className="fixed bottom-0 inset-x-0 bg-beige border-t border-gray p-2 flex gap-1">
          <input
            type="text"
            placeholder="Add an item"
            aria-label="Add an item"
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleAddItem}
            onMouseDown={(e) => e.preventDefault()}
            className="bg-blue hover:bg-blue-dark text-beige px-3 rounded-lg cursor-pointer text-body-2"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default ShoppingList;
