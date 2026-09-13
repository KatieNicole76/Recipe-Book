import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { unitConversion } from '../utils/UnitConversion';
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
  'pantry', 'beverages', 'cleaning', 'housewares', 'other',
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
  other: 'Other',
};

function ShoppingList() {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [itemInput, setItemInput] = useState('');

  useEffect(() => {
    fetchShoppingLists()
      .then((data) => {
        setLists(data);
        if (data.length > 0) setSelectedListId(data[0].id);
      })
      .catch(() => setLists([]));
  }, []);

  const selectedList = lists.find((l) => l.id === selectedListId) || null;

  const replaceList = (updated) => {
    setLists((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleCreateList = async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const created = await createShoppingList(trimmed);
    setLists((prev) => [...prev, created]);
    setSelectedListId(created.id);
    setNewListName('');
    setShowNewListInput(false);
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;
    await deleteShoppingList(selectedList.id);
    const remaining = lists.filter((l) => l.id !== selectedList.id);
    setLists(remaining);
    setSelectedListId(remaining.length > 0 ? remaining[0].id : null);
    setShowDeleteModal(false);
  };

  const handleClearAll = async () => {
    if (!selectedList) return;
    const updated = await clearAllItems(selectedList.id);
    replaceList(updated);
    setShowDeleteModal(false);
  };

  const handleClearChecked = async () => {
    if (!selectedList) return;
    const updated = await clearCheckedItems(selectedList.id);
    replaceList(updated);
    setShowDeleteModal(false);
  };

  const handleToggleItem = async (item) => {
    const updatedItem = await toggleShoppingItem(item.id, !item.is_checked);
    setLists((prev) =>
      prev.map((l) =>
        l.id !== selectedListId
          ? l
          : { ...l, items: l.items.map((i) => (i.id === updatedItem.id ? updatedItem : i)) }
      )
    );
  };

  const handleAddItem = async () => {
    const trimmed = itemInput.trim();
    if (!trimmed || !selectedList) return;
    setItemInput('');
    const created = await addShoppingItem(selectedList.id, trimmed);
    setLists((prev) =>
      prev.map((l) => (l.id !== selectedListId ? l : { ...l, items: [...l.items, created] }))
    );
  };

  const uncheckedByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: (selectedList?.items || []).filter((i) => !i.is_checked && i.category === category),
  })).filter((group) => group.items.length > 0);

  const checkedItems = (selectedList?.items || [])
    .filter((i) => i.is_checked)
    .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));

  const itemLabel = (item) =>
    item.amount != null ? `${unitConversion(item.amount)} ${item.unit} ${item.name}`.replace(/\s+/g, ' ').trim() : item.name;

  return (
    <div className="m-1 pb-20">
      {/******* HEADER ******/}
      <div className="flex items-center">
        <Link
          to="/"
          aria-label="Back"
          className="bg-blue rounded-full p-1 flex items-center justify-center
           z-20 w-3.5 h-3.5"
        >
          <ChevronLeft size={12} className="text-beige" />
        </Link>

        <h1 className="text-dark-green text-h2 my-3 flex-1 text-center">Shopping List</h1>

        <div className="w-3.5 h-3.5" />
      </div>

      {lists.length === 0 && !showNewListInput && (
        <div className="text-center mt-8">
          <p className="text-dark-green text-body-1 mb-3">You don't have any shopping lists yet.</p>
          <button
            type="button"
            onClick={() => setShowNewListInput(true)}
            className="bg-blue text-beige px-3 py-1 rounded-full cursor-pointer text-body-2"
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
            />
          </div>
          <button
            type="button"
            onClick={() => setShowNewListInput((s) => !s)}
            aria-label="Add list"
            className="shrink-0 bg-blue text-beige rounded-full p-1 flex items-center justify-center cursor-pointer"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            aria-label="List options"
            className="shrink-0 text-blue cursor-pointer"
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
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            autoFocus
            className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleCreateList}
            className="bg-blue text-beige px-3 rounded-lg cursor-pointer text-body-2"
          >
            Create
          </button>
        </div>
      )}

      {uncheckedByCategory.map(({ category, items }) => (
        <div key={category} className="mb-4">
          <h2 className="text-dark-green text-h4 mb-1">{CATEGORY_LABELS[category]}</h2>
          <div className="flex flex-col gap-1">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 text-dark-green text-body-1 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={item.is_checked}
                  onChange={() => handleToggleItem(item)}
                  className="w-2 h-2 accent-blue cursor-pointer"
                />
                {itemLabel(item)}
              </label>
            ))}
          </div>
        </div>
      ))}

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
              {checkedItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-dark-green opacity-60 line-through text-body-1 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={item.is_checked}
                    onChange={() => handleToggleItem(item)}
                    className="w-2 h-2 accent-blue cursor-pointer"
                  />
                  {itemLabel(item)}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {showDeleteModal && (
        <div
          className="fixed inset-0 p-1 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-beige rounded-xl p-2 w-full max-w-[320px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-dark-green text-h3 mb-2">List Options</h2>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleClearAll}
                className="w-full text-left px-2 py-1 rounded-lg text-dark-green text-body-1 cursor-pointer hover:bg-white/50"
              >
                Clear list
              </button>
              <button
                type="button"
                onClick={handleClearChecked}
                className="w-full text-left px-2 py-1 rounded-lg text-dark-green text-body-1 cursor-pointer hover:bg-white/50"
              >
                Clear marked items
              </button>
              <button
                type="button"
                onClick={handleDeleteList}
                className="w-full text-left px-2 py-1 rounded-lg text-dark-green text-body-1 cursor-pointer hover:bg-white/50"
              >
                Delete list
              </button>
            </div>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="w-full bg-blue text-beige p-1 rounded-full mt-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedList && (
        <div className="fixed bottom-0 inset-x-0 bg-beige border-t border-gray p-2 flex gap-1">
          <input
            type="text"
            placeholder="Add an item"
            value={itemInput}
            onChange={(e) => setItemInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            className="flex-1 p-1 text-body-2 rounded-lg bg-white box-border placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue text-beige px-3 rounded-lg cursor-pointer text-body-2"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

export default ShoppingList;
