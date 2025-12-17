import { PencilSimple, Plus } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';

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
import { usePageContext } from '@/layouts/useContext';
import { useEffect } from 'react';

const invoices = [
  {
    rule: 'INV001',
    trigger: 'Paid',
    status: 'Active',
    recommend: 'Credit Card',
  },
  {
    rule: 'INV002',
    trigger: 'Pending',
    status: 'Deactive',
    recommend: 'PayPal',
  },
  {
    rule: 'INV003',
    trigger: 'Unpaid',
    status: 'Active',
    recommend: 'Bank Transfer',
  },
  {
    rule: 'INV004',
    trigger: 'Paid',
    status: 'Active',
    recommend: 'Credit Card',
  },
  {
    rule: 'INV005',
    trigger: 'Paid',
    status: 'Active',
    recommend: 'PayPal',
  },
];

const RecommendationsList = ({ featureId }: FeatureComponentProps) => {
  const { setActionElement } = usePageContext();
  const navigate = useNavigate();

  useEffect(() => {
    setActionElement(
      <Button size="sm" onClick={handleAddNewRule} className='text-[16px] bg-[#171717] text-white'>
        <Plus className="mr-2 h-4 w-4" />
        Add New Rule
      </Button>
    );

    return () => {
      setActionElement(null);
    };
  }, []);

  const handleAddNewRule = async () => {
    try {
      // navigate(`edit/${newEntity.id}`);
      navigate(`edit/123`);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recommendations Table */}
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
            {invoices.map((invoice) => (
              <TableRow key={invoice.rule}>
                <TableCell className="font-light">{invoice.rule}</TableCell>
                <TableCell className="font-light">{invoice.trigger}</TableCell>
                <TableCell className="font-light">{invoice.recommend}</TableCell>
                <TableCell>
                  <Switch
                    checked={invoice.status === 'Active'}
                    onCheckedChange={() => {}}
                    disabled={false}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <PencilSimple size={16} onClick={handleAddNewRule} />
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
