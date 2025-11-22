<?php
/**
 * FleetOS Booking Widget
 */

if (!defined('ABSPATH')) {
    exit;
}

class FleetOS_Booking_Widget extends WP_Widget {
    
    public function __construct() {
        parent::__construct(
            'fleetos_booking_widget',
            __('FleetOS Booking Form', 'fleetos-booking'),
            array(
                'description' => __('Display FleetOS car rental availability search form', 'fleetos-booking'),
            )
        );
    }
    
    public function widget($args, $instance) {
        echo $args['before_widget'];
        
        if (!empty($instance['title'])) {
            echo $args['before_title'] . apply_filters('widget_title', $instance['title']) . $args['after_title'];
        }
        
        $options = get_option('fleetos_booking_options');
        $org_slug = $options['organization_slug'] ?? '';
        
        if (empty($org_slug)) {
            echo '<p>' . __('Please configure FleetOS Booking plugin settings.', 'fleetos-booking') . '</p>';
            echo $args['after_widget'];
            return;
        }
        
        include FLEETOS_BOOKING_PLUGIN_DIR . 'templates/booking-form.php';
        
        echo $args['after_widget'];
    }
    
    public function form($instance) {
        $title = !empty($instance['title']) ? $instance['title'] : __('Book Your Car', 'fleetos-booking');
        ?>
        <p>
            <label for="<?php echo esc_attr($this->get_field_id('title')); ?>">
                <?php _e('Title:', 'fleetos-booking'); ?>
            </label>
            <input 
                class="widefat" 
                id="<?php echo esc_attr($this->get_field_id('title')); ?>" 
                name="<?php echo esc_attr($this->get_field_name('title')); ?>" 
                type="text" 
                value="<?php echo esc_attr($title); ?>"
            >
        </p>
        <?php
    }
    
    public function update($new_instance, $old_instance) {
        $instance = array();
        $instance['title'] = (!empty($new_instance['title'])) ? sanitize_text_field($new_instance['title']) : '';
        return $instance;
    }
}

