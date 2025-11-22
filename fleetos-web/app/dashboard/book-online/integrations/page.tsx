'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, CheckCircle, AlertCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { createClientComponentClient } from '@/lib/supabase';

interface Integration {
  id: string;
  integration_type: string;
  name: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string;
  sync_error_message: string | null;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      // Get user and organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData?.organization_id) {
        return;
      }

      setOrganizationId(userData.organization_id);

      // Load integrations
      const { data: integrationsData, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading integrations:', error);
        return;
      }

      setIntegrations(integrationsData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function testIntegration(integrationId: string) {
    try {
      // Test integration health
      const response = await fetch(`/api/v1/integrations/${integrationId}/test`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      // Reload integrations
      await loadData();
    } catch (error) {
      console.error('Error testing integration:', error);
      alert('Failed to test integration');
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">Manage your WordPress and other integrations</p>
      </div>

      {/* WordPress Integration Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">WordPress Integration</h2>
            <p className="text-gray-600 text-sm">
              Integrate FleetOS booking form with your WordPress website
            </p>
          </div>
          <a
            href="https://fleetos.eu/integrations/wordpress"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            Setup Guide
          </a>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Plugin Installation</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Download the FleetOS Booking plugin</li>
            <li>Upload to your WordPress site at /wp-content/plugins/</li>
            <li>Activate the plugin</li>
            <li>Go to Settings → FleetOS Booking</li>
            <li>Enter your organization slug: <code className="bg-white px-2 py-1 rounded">{organizationId?.substring(0, 8)}...</code></li>
          </ol>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold text-gray-900 mb-2">Shortcode</h3>
          <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm">
            [fleetos_booking_form]
          </div>
        </div>
      </div>

      {/* Integration List */}
      <div className="space-y-4">
        {integrations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Integrations</h3>
            <p className="text-gray-600 mb-6">
              You haven't set up any integrations yet. Start by installing the WordPress plugin.
            </p>
          </div>
        ) : (
          integrations.map((integration) => (
            <div key={integration.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(integration.sync_status)}`}>
                      {integration.sync_status}
                    </span>
                    {integration.is_active ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-green-50 text-green-600">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-50 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Type: <span className="font-semibold">{integration.integration_type}</span>
                  </p>
                  {integration.last_sync_at && (
                    <p className="text-xs text-gray-500">
                      Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                    </p>
                  )}
                  {integration.sync_error_message && (
                    <p className="text-sm text-red-600 mt-2">{integration.sync_error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testIntegration(integration.id)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Test
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

