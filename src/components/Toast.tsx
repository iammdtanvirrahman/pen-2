import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div id="toast" role="status" className={message ? 'on' : ''}>
      {message}
    </div>
  );
};
