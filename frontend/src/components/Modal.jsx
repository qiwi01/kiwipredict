import React, { useState, useEffect } from 'react';
import '../css/Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  type = 'confirm', // 'confirm', 'prompt', 'alert', 'form'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  initialValue = '',
  placeholder = '',
  inputType = 'text',
  formData = {},
  formFields = []
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [formValues, setFormValues] = useState(formData);

  useEffect(() => {
    setInputValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      setFormValues(formData);
    }
  }, [formData]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (type === 'prompt') {
      onConfirm(inputValue);
    } else if (type === 'form') {
      onConfirm(formValues);
    } else {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    onCancel && onCancel();
    onClose();
  };

  const handleFormChange = (field, value) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && type !== 'prompt' && type !== 'form') {
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close-btn" onClick={handleCancel}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {children && <div className="modal-message">{children}</div>}

          {type === 'prompt' && (
            <div className="modal-input-group">
              <input
                type={inputType}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                className="modal-input"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
              />
            </div>
          )}

          {type === 'form' && (
            <div className="modal-form">
              {Object.keys(formValues).map((field) => {
                const fieldConfig = formFields.find(f => f.name === field) || {};
                const fieldType = fieldConfig.type || 'text';
                const fieldLabel = fieldConfig.label || field.charAt(0).toUpperCase() + field.slice(1);
                const fieldPlaceholder = fieldConfig.placeholder || `Enter ${field}`;

                if (fieldType === 'select') {
                  return (
                    <div key={field} className="modal-form-group">
                      <label className="modal-form-label">{fieldLabel}</label>
                      <select
                        value={formValues[field] || ''}
                        onChange={(e) => handleFormChange(field, e.target.value)}
                        className="modal-form-select"
                      >
                        {fieldConfig.options?.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={field} className="modal-form-group">
                    <label className="modal-form-label">{fieldLabel}</label>
                    <input
                      type={fieldType}
                      value={formValues[field] || ''}
                      onChange={(e) => handleFormChange(field, e.target.value)}
                      placeholder={fieldPlaceholder}
                      className="modal-form-input"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {type !== 'alert' && (
            <button className="modal-btn modal-btn-cancel" onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button className="modal-btn modal-btn-confirm" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
