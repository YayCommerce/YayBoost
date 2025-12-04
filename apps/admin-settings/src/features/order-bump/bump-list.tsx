/**
 * Bump List - Displays all order bump offers
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gear, PencilSimple, Plus, Trash } from '@phosphor-icons/react';

import { useBulkEntityAction, useDeleteEntity, useEntities, useUpdateEntity } from '@/hooks/use-entities';
import { Entity } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BumpListProps {
  featureId: string;
}

export function BumpList({ featureId }: BumpListProps) {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data, isLoading, error } = useEntities({
    featureId,
    entityType: 'bump',
  });

  const updateEntity = useUpdateEntity(featureId);
  const deleteEntity = useDeleteEntity(featureId);
  const bulkAction = useBulkEntityAction(featureId);

  const bumps = data?.items || [];

  const handleToggleStatus = (bump: Entity) => {
    const newStatus = bump.status === 'active' ? 'inactive' : 'active';
    updateEntity.mutate({
      entityId: bump.id,
      entity: { status: newStatus },
    });
  };

  const handleDelete = (bumpId: number) => {
    if (window.confirm('Are you sure you want to delete this bump offer?')) {
      deleteEntity.mutate({ entityId: bumpId, entityType: 'bump' });
    }
  };

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedIds.length === 0) return;

    if (action === 'delete' && !window.confirm(`Delete ${selectedIds.length} bump offers?`)) {
      return;
    }

    bulkAction.mutate({
      action,
      ids: selectedIds,
      entityType: 'bump',
    });

    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === bumps.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bumps.map((b) => b.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load bump offers</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.length} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
              >
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className="text-destructive"
              >
                Delete
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to="settings">
            <Button variant="outline" size="sm">
              <Gear className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Link to="new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Bump Offer
            </Button>
          </Link>
        </div>
      </div>

      {/* Bumps Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bump Offers</CardTitle>
          <CardDescription>
            Manage your checkout bump offers. Drag to reorder priority.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bumps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No bump offers yet</p>
              <Link to="new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Bump Offer
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === bumps.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bumps.map((bump) => {
                  const settings = bump.settings as Record<string, any>;
                  const discountType = settings?.discount_type || 'none';
                  const discountValue = settings?.discount_value || 0;
                  const triggerType = settings?.trigger_type || 'all';

                  return (
                    <TableRow key={bump.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(bump.id)}
                          onCheckedChange={() => toggleSelect(bump.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{bump.name}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          Product #{settings?.product_id || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {discountType === 'none' ? (
                          <span className="text-muted-foreground">No discount</span>
                        ) : discountType === 'percentage' ? (
                          <span className="text-green-600">{discountValue}% off</span>
                        ) : (
                          <span className="text-green-600">${discountValue} off</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs',
                            triggerType === 'all'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-purple-100 text-purple-700',
                          )}
                        >
                          {triggerType === 'all'
                            ? 'All orders'
                            : triggerType === 'specific_products'
                              ? 'Specific products'
                              : triggerType === 'specific_categories'
                                ? 'Categories'
                                : 'Cart total'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={bump.status === 'active'}
                          onCheckedChange={() => handleToggleStatus(bump)}
                          disabled={updateEntity.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`${bump.id}`)}>
                              <PencilSimple className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(bump.id)}
                              className="text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
