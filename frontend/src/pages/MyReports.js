import React, { useState, useEffect } from 'react';
import { Table, Tag, Card, Button, Space, Modal, message, Typography, Empty, Spin } from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { reportAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { Text, Title } = Typography;

const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getMyReports();
      setReports(response.data);
    } catch (error) {
      message.error('获取周报列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getStatusTag = (status) => {
    const statusMap = {
      draft: { color: 'default', text: '草稿' },
      submitted: { color: 'success', text: '已提交' },
      returned: { color: 'warning', text: '已退回' },
    };
    const info = statusMap[status] || { color: 'default', text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const showDetail = (report) => {
    setSelectedReport(report);
    setDetailModalVisible(true);
  };

  const columns = [
    {
      title: '周次',
      dataIndex: 'week',
      key: 'week',
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '内容摘要',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text) => text || <Text type="secondary">暂无内容</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '提交时间',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      width: 180,
      render: (time) => time ? new Date(time).toLocaleString('zh-CN') : <Text type="secondary">-</Text>,
    },
    {
      title: '退回原因',
      dataIndex: 'return_reason',
      key: 'return_reason',
      width: 150,
      ellipsis: true,
      render: (reason) => reason ? (
        <Tag color="warning" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {reason}
        </Tag>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => showDetail(record)}
          >
            查看
          </Button>
          {record.can_edit && (
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate('/report/write')}
            >
              编辑
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>我的周报</Title>
      
      <Card>
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          locale={{
            emptyText: (
              <Empty description="暂无周报记录">
                <Button type="primary" onClick={() => navigate('/report/write')}>
                  填写第一篇周报
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Modal
        title={`周报详情 - ${selectedReport?.week}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedReport?.can_edit && (
            <Button 
              key="edit" 
              type="primary" 
              onClick={() => {
                setDetailModalVisible(false);
                navigate('/report/write');
              }}
            >
              编辑
            </Button>
          ),
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong>状态：</Text>
                {getStatusTag(selectedReport.status)}
              </Space>
              {selectedReport.submitted_at && (
                <Text type="secondary">
                  提交时间：{new Date(selectedReport.submitted_at).toLocaleString('zh-CN')}
                </Text>
              )}
            </div>
            
            {selectedReport.return_reason && (
              <div style={{ 
                background: '#fff7e6', 
                padding: 16, 
                borderRadius: 4, 
                marginBottom: 16,
                border: '1px solid #ffe58f'
              }}>
                <Text type="warning" style={{ fontWeight: 'bold' }}>退回原因：</Text>
                <br />
                <Text type="warning">{selectedReport.return_reason}</Text>
              </div>
            )}
            
            <div style={{ background: '#f5f5f5', padding: 24, borderRadius: 4 }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>周报内容：</Text>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#333' }}>
                {selectedReport.content || <Text type="secondary">暂无内容</Text>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyReports;
