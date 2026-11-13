import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Trash2, Plus, Loader2, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import PageHeader from '../components/PageHeader';
import CustomSelect from '../components/CustomSelect';
import OptionsModal from '../components/OptionsModal';
import ErrorText from '../components/ErrorText';
import DemoTip from '../components/DemoTip';
import { queryKeys } from '../queryKeys';
import { unitConversion, pluralizeUnit } from '../utils/UnitConversion';
import {
  fetchShoppingLists,
  createShoppingList,
  deleteShoppingList,
  clearAllItems,
  clearCheckedItems,
  addShoppingItem,
  toggleShoppingItem,
  moveShoppingItem,
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
// How long a click is ignored after a drag ends, so letting go of an item
// doesn't also tick its checkbox.
const POST_DRAG_CLICK_GUARD_MS = 300;

let nextTempId = 0;

/**
 * One unchecked item. Press and hold (touch or mouse) picks it up to drag
 * into another section; a normal tap/click still ticks the checkbox.
 */
function DraggableItem({ item, crossedOff, label, onToggle, guardClick }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });

  return (
    <motion.label
      ref={setNodeRef}
      layout
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      {...listeners}
      {...attributes}
      onClickCapture={guardClick}
      className={`flex items-center gap-2 text-body-1 cursor-pointer transition-opacity duration-300 select-none
        [-webkit-touch-callout:none] text-dark-green ${crossedOff ? 'opacity-60 line-through' : ''} ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={crossedOff || item.is_checked}
        disabled={crossedOff}
        onChange={() => onToggle(item)}
        className="w-2 h-2 accent-blue cursor-pointer"
      />
      <span className="flex-1">{label}</span>
    </motion.label>
  );
}

/** A category heading + its items; also a drop target while dragging. */
function CategorySection({ category, isDragActive, children, isEmpty }) {
  const { setNodeRef, isOver } = useDroppable({ id: category });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-4 rounded-lg transition-colors ${isDragActive ? 'p-1 -mx-1' : ''} ${
        isOver ? 'bg-blue/15 outline-2 outline-dashed outline-blue' : ''
      }`}
    >
      <h2 className="text-dark-green text-h4 mb-1">{CATEGORY_LABELS[category]}</h2>
      {isEmpty ? (
        <p className="text-dark-green/60 text-body-2 border border-dashed border-dark-green/40 rounded-lg p-1">
          Drop here
        </p>
      ) : (
        <div className="flex flex-col gap-1">{children}</div>
      )}
    </motion.div>
  );
}

function ShoppingList() {
  const queryClient = useQueryClient();
  const { data: lists = [], isPending: loading } = useQuery({
    queryKey: queryKeys.shoppingLists,
    queryFn: fetchShoppingLists,
  });
  const [selectedListId, setSelectedListId] = useState(null);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [checkedOpen, setCheckedOpen] = useState(false);
  const [itemInput, setItemInput] = useState('');
  const [pendingIds, setPendingIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  // Items typed in but still waiting on the server to categorize them,
  // shown right away with a spinner so the input can clear immediately.
  const [pendingAdds, setPendingAdds] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const lastDragEndAt = useRef(0);

  const sensors = useSensors(
    // Press and hold to pick an item up, for mouse and touch alike, so a
    // quick tap/click still just ticks the checkbox and scrolling works.
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } })
  );

  // Falls back to the first list whenever nothing's been explicitly
  // selected yet (or the previous selection no longer exists), so there's
  // no need for a mount-time effect to seed it once the cached/fetched
  // data arrives.
  const selectedList = lists.find((l) => l.id === selectedListId) || lists[0] || null;

  const setLists = (updater) => {
    queryClient.setQueryData(queryKeys.shoppingLists, (prev = []) =>
      typeof updater === 'function' ? updater(prev) : updater
    );
  };

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
      setLists((prev) => prev.filter((l) => l.id !== selectedList.id));
      setSelectedListId(null);
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
        l.id !== selectedList?.id
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
    // Clear the box straight away so the next item can be typed while this
    // one is still being categorized.
    setItemInput('');
    const listId = selectedList.id;
    const tempId = `pending-${nextTempId++}`;
    setPendingAdds((prev) => [...prev, { tempId, listId, name: trimmed }]);

    try {
      const saved = await addShoppingItem(listId, trimmed);
      // The server merges into an existing item when the name already
      // exists, so replace that one instead of adding a duplicate.
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          const exists = l.items.some((i) => i.id === saved.id);
          return {
            ...l,
            items: exists ? l.items.map((i) => (i.id === saved.id ? saved : i)) : [...l.items, saved],
          };
        })
      );
    } catch (err) {
      setError(`Could not add "${trimmed}": ${err.message}`);
    } finally {
      setPendingAdds((prev) => prev.filter((p) => p.tempId !== tempId));
    }
  };

  const handleDragStart = ({ active }) => {
    setDraggingId(active.id);
  };

  const handleDragEnd = ({ active, over }) => {
    setDraggingId(null);
    lastDragEndAt.current = Date.now();
    if (!over || !selectedList) return;
    const item = selectedList.items.find((i) => i.id === active.id);
    const newCategory = over.id;
    if (!item || item.category === newCategory) return;

    setError(null);
    const listId = selectedList.id;
    const setCategory = (category) =>
      setLists((prev) =>
        prev.map((l) =>
          l.id !== listId
            ? l
            : { ...l, items: l.items.map((i) => (i.id === item.id ? { ...i, category } : i)) }
        )
      );
    setCategory(newCategory);
    moveShoppingItem(item.id, newCategory).catch((err) => {
      setError(err.message);
      setCategory(item.category);
    });
  };

  // Swallows the click that can follow letting go of a dragged item, so
  // the drop doesn't also tick it off.
  const guardClickAfterDrag = (e) => {
    if (Date.now() - lastDragEndAt.current < POST_DRAG_CLICK_GUARD_MS) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const isDragActive = draggingId != null;
  // While dragging, every category is shown (empty ones as drop zones) so
  // an item can be moved into a section that has nothing in it yet.
  const uncheckedByCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: (selectedList?.items || []).filter((i) => !i.is_checked && i.category === category),
  })).filter((group) => isDragActive || group.items.length > 0);

  const draggingItem = isDragActive ? selectedList?.items.find((i) => i.id === draggingId) : null;
  const visiblePendingAdds = pendingAdds.filter((p) => p.listId === selectedList?.id);

  const checkedItems = (selectedList?.items || [])
    .filter((i) => i.is_checked)
    .sort((a, b) => new Date(b.checked_at) - new Date(a.checked_at));

  const itemLabel = (item) =>
    item.amount != null
      ? `${unitConversion(item.amount)} ${pluralizeUnit(item.unit, item.amount)} ${item.name}`.replace(/\s+/g, ' ').trim()
      : item.name;

  return (
    <div className="m-1 pb-20">
      <DemoTip>
        Add ingredients here or from the shopping list icon when viewing a recipe. 
        AI automatically sorts each item into set categories. Press and hold an item to drag it to a different section.
      </DemoTip>

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
              value={selectedList != null ? String(selectedList.id) : ''}
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

      {visiblePendingAdds.length > 0 && (
        <div className="mb-4 flex flex-col gap-1" aria-live="polite">
          {visiblePendingAdds.map((p) => (
            <div key={p.tempId} className="flex items-center gap-2 text-body-1 text-dark-green/70">
              <Loader2 size={16} className="w-2 h-2 animate-spin shrink-0" aria-hidden="true" />
              <span className="flex-1 italic">{p.name}</span>
              <span className="text-body-2 text-dark-green/60">Sorting...</span>
            </div>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {uncheckedByCategory.map(({ category, items }) => (
            <CategorySection
              key={category}
              category={category}
              isDragActive={isDragActive}
              isEmpty={items.length === 0}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((item) => (
                  <DraggableItem
                    key={item.id}
                    item={item}
                    crossedOff={pendingIds.has(item.id)}
                    label={itemLabel(item)}
                    onToggle={handleToggleItem}
                    guardClick={guardClickAfterDrag}
                  />
                ))}
              </AnimatePresence>
            </CategorySection>
          ))}
        </AnimatePresence>

        <DragOverlay>
          {draggingItem && (
            <div className="flex items-center gap-2 text-body-1 text-dark-green bg-beige rounded-lg shadow-lg px-1 py-0.5 cursor-grabbing">
              <GripVertical size={16} aria-hidden="true" />
              {itemLabel(draggingItem)}
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] bg-beige border-t border-gray p-2 flex gap-1">
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
