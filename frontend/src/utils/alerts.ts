import Swal from 'sweetalert2';

// Custom themed SweetAlert instance matching Dental Clinic theme
const customSwal = Swal.mixin({
  background: '#1a2234',
  color: '#f1f5f9',
  confirmButtonColor: '#0d9488',
  cancelButtonColor: '#475569',
  backdrop: 'rgba(10, 15, 30, 0.75)',
  customClass: {
    popup: 'v3-swal-popup',
    title: 'v3-swal-title',
    htmlContainer: 'v3-swal-html',
    confirmButton: 'v3-swal-confirm-btn',
    cancelButton: 'v3-swal-cancel-btn',
  },
});

export const showAlert = {
  /**
   * Success popup or notification
   */
  success: (title: string, text?: string, timer: number = 2500) => {
    return customSwal.fire({
      icon: 'success',
      title,
      text,
      timer,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  },

  /**
   * Error popup with details
   */
  error: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'error',
      title: title || 'Error Occurred',
      text: text || 'An unexpected error occurred. Please try again.',
      confirmButtonText: 'OK',
    });
  },

  /**
   * Warning popup
   */
  warning: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Understood',
    });
  },

  /**
   * Information popup
   */
  info: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Top-end quick Toast notification
   */
  toast: (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    return customSwal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  },

  /**
   * Confirmation Dialog (e.g. Delete, Status Change)
   */
  confirm: async (
    title: string,
    text: string = 'This action cannot be undone.',
    confirmButtonText: string = 'Yes, Confirm',
    icon: 'warning' | 'question' = 'warning'
  ): Promise<boolean> => {
    const res = await customSwal.fire({
      icon,
      title,
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#e11d48',
      focusCancel: true,
    });
    return res.isConfirmed;
  },
};
