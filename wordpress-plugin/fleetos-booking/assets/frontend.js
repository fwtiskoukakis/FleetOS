/**
 * FleetOS Booking Form - Frontend JavaScript
 */

(function($) {
    'use strict';
    
    $(document).ready(function() {
        // Form validation
        $('.fleetos-booking-form').on('submit', function(e) {
            e.preventDefault();
            
            const form = $(this);
            const formData = {
                pickup_date: form.find('[name="pickup_date"]').val(),
                pickup_time: form.find('[name="pickup_time"]').val() || fleetosBooking.defaultPickupTime || '10:00',
                pickup_location_id: form.find('[name="pickup_location_id"]').val(),
                dropoff_date: form.find('[name="dropoff_date"]').val(),
                dropoff_time: form.find('[name="dropoff_time"]').val() || fleetosBooking.defaultDropoffTime || '10:00',
                dropoff_location_id: form.find('[name="dropoff_location_id"]').val(),
            };
            
            // Validate required fields
            if (!formData.pickup_date || !formData.dropoff_date || !formData.pickup_location_id || !formData.dropoff_location_id) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Validate dates
            const pickupDate = new Date(formData.pickup_date);
            const dropoffDate = new Date(formData.dropoff_date);
            
            if (pickupDate >= dropoffDate) {
                alert('Dropoff date must be after pickup date.');
                return;
            }
            
            // Build redirect URL
            const orgSlug = fleetosBooking.organizationSlug;
            const baseUrl = fleetosBooking.redirectUrl;
            const params = new URLSearchParams(formData);
            
            window.location.href = baseUrl + '/' + orgSlug + '/search?' + params.toString();
        });
        
        // Set minimum dropoff date based on pickup date
        $('[name="pickup_date"]').on('change', function() {
            const pickupDate = $(this).val();
            if (pickupDate) {
                const minDropoffDate = new Date(pickupDate);
                minDropoffDate.setDate(minDropoffDate.getDate() + 1);
                $('[name="dropoff_date"]').attr('min', minDropoffDate.toISOString().split('T')[0]);
            }
        });
    });
})(jQuery);

