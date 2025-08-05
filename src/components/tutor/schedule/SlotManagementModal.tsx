import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface SlotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSlotsDate: string | null;
  editType: 'priority' | 'available' | null;
  editSlots: string[];
  isRecurring: boolean;
  recurringWeekday: string;
  slotError: string;
  canSaveSlot: boolean;
  recurringSlots: { priorityHours: { [weekday: string]: string[] }, availableTimes: { [weekday: string]: string[] } };
  onSaveSlots: () => void;
  onAddRecurringSlot: () => void;
  onDeleteRecurringSlot: (type: 'priority' | 'available', weekday: string, slot: string) => void;
  onSlotsChange: (slots: string[]) => void;
  onRecurringChange: (isRecurring: boolean) => void;
  onRecurringWeekdayChange: (weekday: string) => void;
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SlotManagementModal({
  isOpen,
  onClose,
  editSlotsDate,
  editType,
  editSlots,
  isRecurring,
  recurringWeekday,
  slotError,
  canSaveSlot,
  recurringSlots,
  onSaveSlots,
  onAddRecurringSlot,
  onDeleteRecurringSlot,
  onSlotsChange,
  onRecurringChange,
  onRecurringWeekdayChange
}: SlotManagementModalProps) {
  if (!isOpen || !editType) return null;

  return (
    <div className="ultra-modal-overlay" onClick={onClose}>
      <div className="ultra-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ultra-modal-header">
          <h3 className="ultra-modal-title">
            {editType === 'priority' ? 'Edit Priority Hours' : 'Edit Available Time'}
          </h3>
          <button className="ultra-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="ultra-modal-body">
          <div className="ultra-form-group">
            <label className="ultra-form-label">Date</label>
            <div className="ultra-form-input" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
              {editSlotsDate}
            </div>
          </div>
          
          <div className="ultra-form-checkbox">
            <input 
              type="checkbox" 
              id="recurringCheck" 
              checked={isRecurring} 
              onChange={e => onRecurringChange(e.target.checked)} 
            />
            <label htmlFor="recurringCheck">Make Recurring</label>
          </div>
          
          {isRecurring && (
            <div className="ultra-form-group">
              <label className="ultra-form-label">Weekday</label>
              <select 
                className="ultra-form-select" 
                value={recurringWeekday} 
                onChange={e => onRecurringWeekdayChange(e.target.value)}
              >
                {weekdays.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
          )}
          
          {editSlots.map((slot, idx) => (
            <div className="ultra-input-group" key={idx}>
              <input 
                type="text" 
                className="ultra-form-input" 
                value={slot} 
                onChange={e => {
                  const newSlots = [...editSlots];
                  newSlots[idx] = e.target.value;
                  onSlotsChange(newSlots);
                }} 
                placeholder="e.g. 08:00-10:00" 
              />
              <button 
                className="ultra-button danger" 
                onClick={() => onSlotsChange(editSlots.filter((_, i) => i !== idx))}
              >
                🗑️
              </button>
            </div>
          ))}
          
          {slotError && <div className="ultra-alert danger">{slotError}</div>}
          
          <button 
            className="ultra-button secondary" 
            onClick={() => onSlotsChange([...editSlots, ''])}
          >
            ➕ Add Slot
          </button>
          
          {isRecurring && (
            <button 
              className="ultra-button primary" 
              onClick={onAddRecurringSlot} 
              disabled={!canSaveSlot}
              style={{ marginLeft: '8px' }}
            >
              🔄 Add as Recurring
            </button>
          )}
          
          {/* Recurring Slots Section */}
          {isRecurring && (
            <div className="ultra-recurring-slots-section">
              <div className="ultra-recurring-slots-title">
                Recurring {editType === 'priority' ? 'Priority' : 'Available'} Slots
              </div>
              {Object.entries(recurringSlots[editType === 'priority' ? 'priorityHours' : 'availableTimes']).map(([day, slots]) => (
                <div key={day} className="ultra-recurring-slot-item">
                  <span className="ultra-recurring-slot-day">{day}:</span>
                  {slots.map(slot => (
                    <span key={slot} className="ultra-recurring-slot-time">
                      {slot}
                      <button 
                        className="ultra-recurring-slot-remove" 
                        onClick={() => onDeleteRecurringSlot(editType, day, slot)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="ultra-modal-footer">
          <button 
            className="ultra-button primary" 
            onClick={onSaveSlots} 
            disabled={!canSaveSlot}
          >
            💾 Save
          </button>
          <button className="ultra-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 