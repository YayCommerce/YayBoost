import { useCallback, useMemo } from 'react';
import { useEntities, useFeature, useUpdateEntity } from '@/hooks';
import { ArrowLeft, PencilSimple, Plus } from '@phosphor-icons/react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { FeatureComponentProps } from '..';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-gray-500">
        <div className="text-lg font-medium">No recommendation rules yet</div>
        <div className="text-sm">Create your first rule to get started</div>
      </div>
      <Link to={'new'}>
        <Button className="bg-[#171717] text-[16px] text-white">
          <Plus className="mr-2 h-4 w-4" />
          Create First Rule
        </Button>
      </Link>
    </div>
  );
}

const RecommendationsList = ({ featureId }: FeatureComponentProps) => {
  const navigate = useNavigate();
  const updateEntity = useUpdateEntity(featureId);
  const { data: feature } = useFeature(featureId);
  const { data } = useEntities({
    featureId,
    entityType: 'recommendation',
  });
  const recommendations = data?.items || [];

  const parseRecommendation = useMemo(() => {
    return recommendations.map((recommendation) => {
      const wooCommerceData = (window as any)?.yayboostData?.localize;

      const settings = recommendation?.settings;

      const triggerType = settings?.when_customer_views_type || 'category';
      const triggerValue = settings?.when_customer_views_value || '';
      let triggerLabel = '';
      switch (triggerType) {
        case 'category':
          triggerLabel =
            wooCommerceData?.categories?.find((category: any) => category.value === triggerValue)
              ?.label || triggerValue;
          break;
        case 'product':
          triggerLabel =
            wooCommerceData?.products?.find((product: any) => product.value === triggerValue)
              ?.label || triggerValue;
          break;
        case 'tag':
          triggerLabel =
            wooCommerceData?.tags?.find((tag: any) => tag.id === triggerValue)?.label ||
            triggerValue;
          break;
      }

      const recommendType = settings?.recommend_products_from_type || 'category';
      const recommendValue = (settings?.recommend_products_from_value as string[]) || [];
      const recommendLabels = recommendValue.map((value: string) => {
        switch (recommendType) {
          case 'category':
            return (
              wooCommerceData?.categories?.find((category: any) => category.value === value)
                ?.label || value
            );
          case 'product':
            return (
              wooCommerceData?.products?.find((product: any) => product.value === value)?.label ||
              value
            );
          case 'tag':
            return wooCommerceData?.tags?.find((tag: any) => tag.id === value)?.label || value;
          default:
            return value;
        }
      });

      return {
        id: recommendation.id,
        name: recommendation.name || '(Unnamed rule)',
        triggerLabel,
        recommendLabels,
        status: recommendation.status,
      };
    });
  }, [recommendations]);

  const handleToggleStatus = useCallback(
    (id: number, currentStatus: string) => {
      const entity = recommendations.find((recommendation) => recommendation.id === id);

      if (!entity) return;

      updateEntity.mutate({
        entityId: id,
        entity: { ...entity, status: currentStatus === 'active' ? 'inactive' : 'active' },
      });
    },
    [updateEntity],
  );

  if (recommendations?.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Recommendations Table */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/features`}
            className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md border"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{feature?.name}</h1>
            <p className="text-muted-foreground text-sm">{feature?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={'new'}>
            <Button size="sm" className="bg-[#171717] text-[16px] text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add New Rule
            </Button>
          </Link>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <Table className="text-[16px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[390px] font-bold">Rule name</TableHead>
              <TableHead className="w-[222px] font-bold">Trigger</TableHead>
              <TableHead className="w-[296px] font-bold">Recommend</TableHead>
              <TableHead className="w-[240px] font-bold">Status</TableHead>
              <TableHead className="w-[80px] font-bold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parseRecommendation?.map((recommendation) => (
              <TableRow key={recommendation.id}>
                <TableCell className="font-light">{recommendation.name}</TableCell>
                <TableCell className="font-light">{recommendation.triggerLabel}</TableCell>
                <TableCell className="font-light">
                  {recommendation.recommendLabels && recommendation.recommendLabels.length > 0
                    ? recommendation.recommendLabels.join(', ')
                    : '-'}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={recommendation.status === 'active'}
                    onCheckedChange={() =>
                      handleToggleStatus(recommendation.id, recommendation.status)
                    }
                    disabled={false}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <PencilSimple size={16} onClick={() => navigate(`${recommendation.id}`)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecommendationsList;
